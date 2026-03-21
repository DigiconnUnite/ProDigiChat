import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { sendTextMessage, sendTemplateMessage } from '@/app/api/whatsapp/messages'

async function validateSession(request: NextRequest) {
  const token = await getToken({ req: request })
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  return null
}

// Helper function to get organization ID from token
async function getOrganizationId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request })
  // Handle both string and object types for organizationId
  const orgId = token?.organizationId
  if (typeof orgId === 'string') {
    return orgId
  }
  // Also check if it's stored as a token property
  if (orgId && typeof orgId === 'object' && 'toString' in orgId) {
    return orgId.toString()
  }
  return null
}

// POST /api/campaigns/[id]/launch - Launch a campaign (start sending messages)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorizedResponse = await validateSession(request)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const { id } = await params
    
    // Debug: Log the campaign ID
    console.log('[CampaignLaunch] Starting campaign launch for ID:', id)
    
    // Get userId and organization ID from token
    const token = await getToken({ req: request })
    const userId = token?.sub
    // Handle organizationId - can be string or object
    let orgId: string | undefined = undefined
    if (token?.organizationId) {
      if (typeof token.organizationId === 'string') {
        orgId = token.organizationId
      } else if (typeof token.organizationId === 'object' && 'toString' in token.organizationId) {
        orgId = token.organizationId.toString()
      }
    }
    console.log('[CampaignLaunch] Organization ID from token:', orgId)
    
    if (!orgId) {
      console.log('[CampaignLaunch] No organization ID found - will use default')
    }

    // Get the campaign (filter by userId for security)
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        audience: {
          include: {
            members: {
              include: {
                contact: true
              }
            }
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Verify the campaign belongs to the current user
    if (campaign.createdBy && campaign.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to launch this campaign' },
        { status: 403 }
      )
    }

    // Check if campaign has a WhatsApp number assigned
    if (!campaign.whatsappNumberId) {
      console.log('[CampaignLaunch] No WhatsApp number assigned to campaign:', id)
      return NextResponse.json(
        { success: false, error: 'No WhatsApp number assigned to this campaign' },
        { status: 400 }
      )
    }
    
    console.log('[CampaignLaunch] Campaign has whatsappNumberId:', campaign.whatsappNumberId)

    // Check WhatsApp verification status before sending messages
    const creds = await prisma.whatsAppCredential.findFirst({
      where: { 
        OR: [
          { id: campaign.whatsappNumberId },
          { phoneNumberId: campaign.whatsappNumberId },
          { phoneNumbers: { some: { id: campaign.whatsappNumberId } } }
        ]
      },
      include: { phoneNumbers: true }
    })

    if (!creds?.isActive) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp account is not connected or inactive. Please reconnect in Settings.' },
        { status: 400 }
      )
    }

    // Check if phone number is verified (warn but allow sending)
    const phoneVerified = creds.phoneNumbers?.find(p => p.isDefault || p.isVerified)
    const phoneNotVerifiedWarning = !phoneVerified?.isVerified 
      ? '⚠️ Warning: Your phone number is not verified. Messages to unverified numbers may fail.' 
      : null
    if (phoneNotVerifiedWarning) {
      console.log('[CampaignLaunch]', phoneNotVerifiedWarning)
    }

    // Check if campaign can be launched
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot launch campaign with status: ${campaign.status}` },
        { status: 400 }
      )
    }

    // Parse message content to validate
    let messageContent: any = {}
    try {
      messageContent = JSON.parse(campaign.messageContent)
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid message content' },
        { status: 400 }
      )
    }

    // Check if there's a template or message
    if (!messageContent.templateId && !messageContent.freeformMessage) {
      return NextResponse.json(
        { success: false, error: 'No message content defined' },
        { status: 400 }
      )
    }

    // Get contacts to send to
    let contacts: any[] = []
    
    if (campaign.audienceSegmentId && campaign.audience) {
      // Get contacts from segment (filter out any undefined contacts)
      contacts = campaign.audience.members
        .map((m: any) => m.contact)
        .filter((c: any) => c && c.phoneNumber)
    } else {
      // Get all opted-in contacts for this user
      contacts = await prisma.contact.findMany({
        where: { 
          optInStatus: 'opted_in',
          userId: userId
        }
      })
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No contacts found to send to' },
        { status: 400 }
      )
    }

    // Parse schedule
    let schedule: any = {}
    try {
      if (campaign.schedule) {
        schedule = JSON.parse(campaign.schedule)
      }
    } catch (e) {
      schedule = { sendNow: true }
    }

    // If scheduled for later, update status to scheduled
    if (schedule.scheduledAt && !schedule.sendNow) {
      const scheduledDate = new Date(schedule.scheduledAt)
      if (scheduledDate > new Date()) {
        await prisma.campaign.update({
          where: { id },
          data: { status: 'scheduled' }
        })
        return NextResponse.json({
          success: true,
          message: 'Campaign scheduled successfully',
          scheduledFor: schedule.scheduledAt
        })
      }
    }

    // Launch the campaign - update status to running
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'running' }
    })

    // Create message records for each contact AND send via WhatsApp API (Issue 2 fix)
    const messageResults = await Promise.allSettled(
      contacts.map(async (contact: any) => {
        try {
          let whatsappResult = null
          
          // Send message via WhatsApp API based on message type
          if (messageContent.type === 'template' && messageContent.templateId) {
            // Get template details
            const template = await prisma.messageTemplate.findUnique({
              where: { id: messageContent.templateId }
            })
            
            if (template) {
              // Check if template has been submitted to Meta
              if (!template.whatsappTemplateId) {
                console.error('[CampaignLaunch] Template has not been submitted to Meta:', template.name);
                throw new Error(`Template "${template.name}" has not been submitted to WhatsApp Meta. Please sync or resubmit the template.`);
              }
              
              // Build template components with variables
              const components: any[] = []
              
              // Add header if there's a media attachment
              if (messageContent.mediaAttachments && messageContent.mediaAttachments.length > 0) {
                const media = messageContent.mediaAttachments[0]
                const headerParams: Record<string, { url: string }> = {}
                headerParams[media.type] = { url: media.url }
                components.push({
                  type: 'header',
                  parameters: [{
                    type: 'media',
                    ...headerParams
                  }] as any
                })
              }
              
              // Add body with template variables
              if (messageContent.templateVariables) {
                const variableValues = Object.values(messageContent.templateVariables)
                components.push({
                  type: 'body',
                  parameters: variableValues.map((value) => ({
                    type: 'text',
                    text: String(value ?? '')
                  }))
                })
              }
              
              // Get template language from database, default to en_US
              const templateLanguage = (template.language as string) || 'en_US'
              
              console.log('[CampaignLaunch] Using template:', template.name, 'with language:', templateLanguage, 'whatsappTemplateId:', template.whatsappTemplateId)
              
              whatsappResult = await sendTemplateMessage(
                contact.phoneNumber,
                template.name,
                components,
                orgId || undefined,
                templateLanguage
              )
            }
          } else if (messageContent.freeformMessage) {
            // Personalize the message
            let personalizedMessage = messageContent.freeformMessage
            personalizedMessage = personalizedMessage.replace(/\{\{contact\.name\}\}/g, contact.firstName || 'there')
            personalizedMessage = personalizedMessage.replace(/\{\{contact\.firstName\}\}/g, contact.firstName || 'there')
            personalizedMessage = personalizedMessage.replace(/\{\{contact\.lastName\}\}/g, contact.lastName || '')
            
            whatsappResult = await sendTextMessage(contact.phoneNumber, personalizedMessage, orgId || undefined)
          }
          
          // Create message record in database
          const message = await prisma.message.create({
            data: {
              contactId: contact.id,
              campaignId: campaign.id,
              direction: 'outgoing',
              status: whatsappResult ? 'sent' : 'failed',
              content: JSON.stringify({
                type: messageContent.type,
                templateId: messageContent.templateId,
                templateVariables: messageContent.templateVariables,
                freeformMessage: messageContent.freeformMessage,
                mediaAttachments: messageContent.mediaAttachments
              }),
              whatsappMessageId: whatsappResult && 'messages' in whatsappResult ? (whatsappResult as any).messages?.[0]?.id || null : null
            }
          })
          
          return { success: true, message, contactId: contact.id }
        } catch (error) {
          console.error(`Failed to send message to contact ${contact.id}:`, error)
          
          // Create failed message record
          const message = await prisma.message.create({
            data: {
              contactId: contact.id,
              campaignId: campaign.id,
              direction: 'outgoing',
              status: 'failed',
              content: JSON.stringify({
                type: messageContent.type,
                templateId: messageContent.templateId,
                templateVariables: messageContent.templateVariables,
                freeformMessage: messageContent.freeformMessage,
                mediaAttachments: messageContent.mediaAttachments
              }),
              whatsappMessageId: null
            }
          })
          
          return { success: false, message, contactId: contact.id, error: String(error) }
        }
      })
    )

    // Calculate stats from results
    const sentCount = messageResults.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failedCount = messageResults.length - sentCount

    // Update campaign stats
    await prisma.campaign.update({
      where: { id },
      data: {
        stats: JSON.stringify({
          totalSent: sentCount,
          delivered: 0,
          read: 0,
          failed: failedCount,
          clicked: 0
        })
      }
    })

    // In a background job, you would:
    // 1. Update message status as delivery/read receipts come in
    // 2. Update campaign stats periodically

    return NextResponse.json({
      success: true,
      message: phoneNotVerifiedWarning 
        ? 'Campaign launched with warnings: Your phone number is not verified. Some messages may fail.' 
        : 'Campaign launched successfully',
      warning: phoneNotVerifiedWarning,
      data: {
        campaignId: id,
        status: 'running',
        recipientsCount: contacts.length,
        sentCount,
        failedCount
      }
    })
  } catch (error) {
    console.error('Error launching campaign:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to launch campaign' },
      { status: 500 }
    )
  }
}
