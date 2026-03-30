import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { addBulkToQueue, processQueue } from '@/lib/queue'
import { requireRole } from '@/lib/rbac'

async function validateSession(request: NextRequest) {
  const token = await getToken({ req: request })
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  return token
}

// POST /api/campaigns/[id]/launch - Launch a campaign (start sending messages)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get token once for all operations
  const token = await getToken({ req: request })
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const userId = token.sub
  const orgId = token.organizationId as string

  if (!userId || !orgId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // RBAC: Require member role or higher to launch campaigns
  const roleCheck = await requireRole(request, 'member')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const { id } = await params

    // Debug: Log the campaign ID
    console.log('[CampaignLaunch] Starting campaign launch for ID:', id)
    
    // Get the campaign first to check organizationId
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
    
    // Verify the campaign belongs to the user's organization
    if (campaign.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to launch this campaign' },
        { status: 403 }
      )
    }
    
    // Any active org member should be able to launch campaigns
    const membership = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: campaign.organizationId, isActive: true }
    });
    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this organization" }, { status: 403 });
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
    // Find active WhatsApp credential for the organization
    const creds = await prisma.whatsAppCredential.findFirst({
      where: { 
        organizationId: campaign.organizationId ?? undefined,
        isActive: true
      },
      include: { phoneNumbers: true }
    }) as any
    
    if (!creds) {
      console.log('[CampaignLaunch] No WhatsApp credential found for org:', campaign.organizationId)
    } else {
      console.log('[CampaignLaunch] Found WhatsApp credential:', creds.id)
    }

    if (!creds?.isActive) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp account is not connected or inactive. Please reconnect in Settings.' },
        { status: 400 }
      )
    }

    // Check if phone number is verified (warn but allow sending)
    const phoneVerified = creds.phoneNumbers?.find((p: any) => p.isDefault || p.isVerified)
    const phoneNotVerifiedWarning = !phoneVerified?.isVerified 
      ? '⚠️ Warning: Your phone number is not verified. Messages to unverified numbers may fail.' 
      : null
    if (phoneNotVerifiedWarning) {
      console.log('[CampaignLaunch]', phoneNotVerifiedWarning)
    }
    
    console.log('[CampaignLaunch] Phone verified:', phoneVerified?.isVerified, 'Phone number:', phoneVerified?.phoneNumber)

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
      // BUG FIX: Get all opted-in contacts for the organization, not just the user's contacts
      // This ensures multi-user organizations can send campaigns to contacts created by teammates
      contacts = await prisma.contact.findMany({
        where: { 
          optInStatus: 'opted_in',
          organizationId: campaign.organizationId
        }
      })
    }

    // BUG FIX: Count contacts using organizationId instead of userId
    const totalContacts = await prisma.contact.count({
      where: { organizationId: campaign.organizationId }
    })
    const optedInContacts = await prisma.contact.count({
      where: { 
        optInStatus: 'opted_in',
        organizationId: campaign.organizationId
      }
    })
    
    console.log('[CampaignLaunch] Total contacts:', totalContacts, 'Opted in:', optedInContacts)
    
    if (contacts.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No contacts found to send to',
          details: {
            totalContacts,
            optedInContacts,
            hasSegment: !!campaign.audienceSegmentId
          },
          hint: optedInContacts === 0 
            ? 'No contacts have opted in. Contacts must have "opted_in" status to receive messages.'
            : 'The selected segment may have no contacts with opted_in status.'
        },
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

    // Prepare message content for queue
    let messageContentForQueue: any = {}
    
    if (messageContent.type === 'template' && messageContent.templateId) {
      // Get template details
      const template = await prisma.messageTemplate.findUnique({
        where: { id: messageContent.templateId }
      })
      
      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 400 }
        )
      }
      
      // BUG FIX: Allow templates that are locally approved (status APPROVED but no whatsappTemplateId)
      // Only check for whatsappTemplateId if the template is in PENDING status on Meta
      // Approved templates can be used even without whatsappTemplateId if they have local approval
      if (!template.whatsappTemplateId && template.status === 'PENDING') {
        return NextResponse.json(
          { success: false, error: `Template "${template.name}" is still pending approval on WhatsApp Meta. Please wait for approval or sync the template.` },
          { status: 400 }
        )
      }
      
      // Log template info for debugging
      console.log('[CampaignLaunch] Template info:', { name: template.name, whatsappTemplateId: template.whatsappTemplateId, status: template.status });
      
      // Build template components with variables (use default values for now)
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
      
      // Add body with template variables (will be personalized by worker)
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
      
      const templateLanguage = (template.language as string) || 'en_US'
      
      messageContentForQueue = {
        type: 'template',
        templateId: messageContent.templateId,
        templateName: template.name,
        templateLanguage,
        components,
        mediaAttachments: messageContent.mediaAttachments
      }
    } else if (messageContent.freeformMessage) {
      messageContentForQueue = {
        type: 'text',
        freeformMessage: messageContent.freeformMessage
      }
    }

    // Build queue messages for all contacts
    const queueMessages = contacts.map((contact: any) => {
      let finalMessageContent = { ...messageContentForQueue }
      
      // Personalize message for text messages
      if (messageContent.freeformMessage) {
        let personalizedMessage = messageContent.freeformMessage
        personalizedMessage = personalizedMessage.replace(/\{\{contact\.name\}\}/g, contact.firstName || 'there')
        personalizedMessage = personalizedMessage.replace(/\{\{contact\.firstName\}\}/g, contact.firstName || 'there')
        personalizedMessage = personalizedMessage.replace(/\{\{contact\.lastName\}\}/g, contact.lastName || '')
        finalMessageContent = {
          type: 'text',
          text: personalizedMessage
        }
      }
      
      return {
        recipientPhone: contact.phoneNumber,
        messageContent: JSON.stringify(finalMessageContent),
        campaignId: campaign.id,
        contactId: contact.id,
        messageType: messageContent.type === 'template' ? 'template' : 'text'
      }
    })

    // BUG FIX: Get the WhatsApp account ID to use for sending messages
    // Use the campaign's chosen phone number (whatsappNumberId) to find the correct credential
    let whatsappAccountId: string | undefined;

    if (campaign.whatsappNumberId) {
      // Find the credential that has the campaign's selected phone number
      const phoneNumber = creds?.phoneNumbers?.find((p: any) => p.id === campaign.whatsappNumberId);
      if (phoneNumber) {
        whatsappAccountId = creds?.id;
        console.log('[CampaignLaunch] Using campaign-selected phone number:', campaign.whatsappNumberId, 'with credential:', whatsappAccountId);
      } else {
        // Phone number not found in current credential, search all credentials
        const allCreds = await prisma.whatsAppCredential.findMany({
          where: {
            organizationId: campaign.organizationId ?? undefined,
            isActive: true
          },
          include: { phoneNumbers: true }
        });

        for (const cred of allCreds) {
          const hasPhoneNumber = cred.phoneNumbers?.some((p: any) => p.id === campaign.whatsappNumberId);
          if (hasPhoneNumber) {
            whatsappAccountId = cred.id;
            console.log('[CampaignLaunch] Found credential with phone number in other account:', whatsappAccountId);
            break;
          }
        }
      }
    }

    // Fallback to default credential if not found
    if (!whatsappAccountId) {
      whatsappAccountId = creds?.id;
    }

    console.log('[CampaignLaunch] Using WhatsApp account ID:', whatsappAccountId);

    // Enqueue all messages - let cron handle processing
    if (queueMessages.length > 0 && orgId) {
      console.log('[CampaignLaunch] Adding messages to queue:', queueMessages.length, 'accountId:', whatsappAccountId)
      // BUG FIX: Pass whatsappAccountId to the queue
      await addBulkToQueue(orgId, queueMessages, whatsappAccountId)

      // Trigger the queue processing immediately in the background
      // This ensures messages start sending right away in local development
      // where Vercel Cron jobs don't run automatically
      console.log(`[CampaignLaunch] Triggering background queue processing for org: ${orgId}`);
      processQueue(orgId, 100).then(result => {
        console.log(`[CampaignLaunch] Background queue processing completed:`, {
          processed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed,
          skipped: result.skipped
        });
      }).catch(err => {
        console.error('[CampaignLaunch] Background queue processing error:', err);
      });

      // Set campaign status to running immediately after queuing
      await prisma.campaign.update({
        where: { id },
        data: {
          status: 'running',
          stats: JSON.stringify({
            totalSent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            clicked: 0
          })
        }
      })
    } else if (!orgId) {
      console.error('[CampaignLaunch] ERROR: No organization ID - messages will not be sent!')
      return NextResponse.json(
        { success: false, error: 'Organization not found. Please log in again.' },
        { status: 400 }
      )
    }

    // Return success - cron will handle actual sending
    return NextResponse.json({
      success: true,
      message: 'Campaign queued for dispatch',
      warning: phoneNotVerifiedWarning,
      data: {
        campaignId: id,
        status: 'running',
        recipientsCount: contacts.length,
        queuedCount: queueMessages.length
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
