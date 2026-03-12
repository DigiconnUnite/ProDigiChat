import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWhatsAppClient } from '@/app/api/whatsapp/auth';
import { getToken } from 'next-auth/jwt';

/**
 * Helper function to extract variables from template body
 * Supports both {{1}} and {{variable_name}} formats
 */
function extractVariablesFromBody(body: string): string[] {
  const variables = new Set<string>();
  
  // Match numbered variables like {{1}}, {{2}}, etc.
  const numberedMatches = body.match(/\{\{\d+\}\}/g);
  if (numberedMatches) {
    numberedMatches.forEach(m => variables.add(m));
  }
  
  // Match named variables like {{1}}, {{name}}, etc.
  const namedMatches = body.match(/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g);
  if (namedMatches) {
    namedMatches.forEach(m => variables.add(m));
  }
  
  return Array.from(variables);
}

/**
 * Generate a consistent button ID based on button index
 */
function generateButtonId(index: number, text: string): string {
  // Create a deterministic ID based on index and text
  const textHash = text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `btn_${index}_${textHash}`;
}

/**
 * Helper function to extract all translation data from Meta template components
 */
function extractTranslationFromMetaTemplate(metaTemplate: any): any {
  let header: any = undefined;
  let body = '';
  let footer: any = undefined;
  let buttons: any[] = [];
  let language = metaTemplate.language || 'en_US';

  // Process components if available
  if (metaTemplate.components) {
    for (const component of metaTemplate.components) {
      if (component.type === 'HEADER') {
        if (component.format === 'TEXT') {
          header = { type: 'text', text: component.text };
        } else if (component.format === 'IMAGE') {
          header = { type: 'image', mediaUrl: component.example?.header_handle?.[0] };
        } else if (component.format === 'VIDEO') {
          header = { type: 'video', mediaUrl: component.example?.header_handle?.[0] };
        } else if (component.format === 'DOCUMENT') {
          header = { type: 'document', mediaUrl: component.example?.header_handle?.[0], filename: component.text };
        }
      } else if (component.type === 'BODY') {
        body = component.text || '';
      } else if (component.type === 'FOOTER') {
        footer = component.text;
      } else if (component.type === 'BUTTONS') {
        buttons = (component.buttons || []).map((btn: any, index: number) => ({
          id: generateButtonId(index, btn.text),
          type: btn.type === 'QUICK_REPLY' ? 'quick_reply' : 'call_to_action',
          text: btn.text,
          actionType: btn.type === 'URL' ? 'url' : btn.type === 'PHONE_NUMBER' ? 'phone' : undefined,
          actionValue: btn.url || btn.phone_number,
        }));
      }
    }
  }

  return {
    language,
    header,
    body,
    footer,
    buttons,
  };
}

/**
 * GET endpoint to fetch templates from Meta and optionally import them
 * 
 * Query params:
 * - import: 'true' to import templates into local database (optional)  
 * - organizationId: the organization ID (optional, uses session)
 */
export async function GET(request: NextRequest) {
  try {
    // Get organization from session
    const token = await getToken({ req: request });
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Unauthorized - no organization found' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);  
    const shouldImport = searchParams.get('import') === 'true';

    // Get WhatsApp credentials from database for this organization
    const credentials = await prisma.whatsAppCredential.findFirst({
      where: { 
        organizationId: orgId,
        isActive: true
      }
    });

    if (!credentials) {
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please connect WhatsApp in Settings first.' },
        { status: 400 }
      );
    }

    // Create WhatsApp client with stored credentials for this organization
    const client = await getWhatsAppClient(orgId);

    // Fetch templates from Meta
    console.log('[Meta Templates] Fetching templates from Meta for org:', orgId);
    const response = await client.getAllTemplates();
    const metaTemplates = response.data?.data || [];
    console.log('[Meta Templates] Found templates in Meta:', metaTemplates.length);
    console.log('[Meta Templates] Template names:', metaTemplates.map((t: any) => t.name));

    // If import is requested, sync templates to local database
    if (shouldImport) {
      let imported = 0;
      let skipped = 0;
      let updated = 0;

      // Check for force parameter to update existing templates with latest content from Meta
      const forceUpdate = searchParams.get('force') === 'true';
      console.log('[Meta Templates] Force update:', forceUpdate);

      for (const metaTemplate of metaTemplates) {
        console.log('[Meta Templates] Processing template:', metaTemplate.name, 'status:', metaTemplate.status);
        
        try {
          // Extract full translation data from Meta template
          const translation = extractTranslationFromMetaTemplate(metaTemplate);

          // Check if template already exists (in this organization OR globally by name)
          // Note: Due to unique constraint on name, we need to check more broadly
          const existing = await prisma.messageTemplate.findFirst({
            where: { 
              name: metaTemplate.name,
            }
          });

          console.log('[Meta Templates] Existing template check for', metaTemplate.name, ':', existing ? 'FOUND (org: ' + existing.organizationId + ')' : 'NOT FOUND');

          if (existing) {
            // Update existing template with latest Meta info
            // Also update organizationId so it's visible to current org
            const currentStatus = existing.status;
            const newMetaStatus = metaTemplate.status === 'APPROVED' ? 'approved' : 
                           metaTemplate.status === 'REJECTED' ? 'rejected' : 'pending';
            
            // Determine if we should update
            const shouldUpdateStatus = currentStatus !== newMetaStatus;
            const shouldUpdateContent = forceUpdate || !existing.content;
            // Update orgId if template belongs to different org
            const shouldUpdateOrgId = existing.organizationId !== orgId;
            
            console.log(`[Meta Templates] Template ${existing.name}: local status="${currentStatus}", Meta status="${newMetaStatus}", updatingStatus=${shouldUpdateStatus}, updatingContent=${shouldUpdateContent}, updatingOrgId=${shouldUpdateOrgId}`);
            
            if (shouldUpdateStatus || shouldUpdateContent || shouldUpdateOrgId) {
              const updateData: any = {
                status: newMetaStatus,
                whatsappTemplateId: metaTemplate.id,
              };
              
              // Update organizationId if needed
              if (shouldUpdateOrgId) {
                updateData.organizationId = orgId;
              }
              
              // Also update content if forced or if content is missing
              if (shouldUpdateContent) {
                updateData.content = JSON.stringify([translation]);
                updateData.variables = JSON.stringify(extractVariablesFromBody(translation.body));
                updateData.category = metaTemplate.category?.toLowerCase() || 'marketing';
              }
              
              await prisma.messageTemplate.update({
                where: { id: existing.id },
                data: updateData
              });
              updated++;
            }
            skipped++;
          } else {
            // Create new template from Meta with complete translation data
            console.log(`[Meta Templates] Creating new template: ${metaTemplate.name}`);
            await prisma.messageTemplate.create({
              data: {
                name: metaTemplate.name,
                category: metaTemplate.category?.toLowerCase() || 'marketing',
                content: JSON.stringify([translation]),
                variables: JSON.stringify(extractVariablesFromBody(translation.body)),
                status: metaTemplate.status === 'APPROVED' ? 'approved' : 
                       metaTemplate.status === 'REJECTED' ? 'rejected' : 'pending',
                whatsappTemplateId: metaTemplate.id,
                organizationId: orgId,
                userId: token?.sub
              }
            });
            imported++;
          }
        } catch (templateError) {
          console.error(`Error syncing template ${metaTemplate.name}:`, templateError);
        }
      }

      return NextResponse.json({
        success: true,
        totalInMeta: metaTemplates.length,
        imported,
        updated,
        skipped,
        message: `Sync completed. ${imported} new templates imported, ${updated} updated. ${skipped} templates unchanged.`
      });
    }

    // Return templates from Meta without importing
    return NextResponse.json({
      success: true,
      templates: metaTemplates.map((t: any) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        category: t.category,
        language: t.language,
        qualityScore: t.quality_score,
        rejectionReason: t.rejection_reason,
      })),
      total: metaTemplates.length,
    });

  } catch (error: any) {
    console.error('Error fetching templates from Meta:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to fetch templates from Meta';
    let statusCode = 500;
    
    // Check for specific error types
    if (error.message?.includes('WhatsApp credentials not configured')) {
      errorMessage = 'WhatsApp is not connected. Please connect WhatsApp in Settings first.';
      statusCode = 400;
    } else if (error.message?.includes('access token')) {
      errorMessage = 'WhatsApp access token has expired. Please reconnect WhatsApp in Settings.';
      statusCode = 401;
    } else if (error.response?.data?.error?.message) {
      // Meta API returned an error
      errorMessage = `Meta API Error: ${error.response.data.error.message}`;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot connect to Meta API. Please check your internet connection.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

/**
 * POST endpoint to import templates from Meta into local database
 */
export async function POST(request: NextRequest) {
  try {
    // Get organization from session
    const token = await getToken({ req: request });
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Unauthorized - no organization found' },
        { status: 401 }
      );
    }
    
    // Get WhatsApp credentials from database for this organization
    const credentials = await prisma.whatsAppCredential.findFirst({
      where: { 
        organizationId: orgId,
        isActive: true
      }
    });

    if (!credentials) {
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please connect WhatsApp in Settings first.' },
        { status: 400 }
      );
    }

    // Create WhatsApp client with stored credentials for this organization
    const client = await getWhatsAppClient(orgId);

    // Fetch templates from Meta
    console.log('[Meta Templates POST] Fetching templates from Meta for org:', orgId);
    const response = await client.getAllTemplates();
    const metaTemplates = response.data?.data || [];
    console.log('[Meta Templates POST] Found templates in Meta:', metaTemplates.length);
    console.log('[Meta Templates POST] Template names:', metaTemplates.map((t: any) => t.name));

    // Import templates to local database
    let imported = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const metaTemplate of metaTemplates) {
      console.log('[Meta Templates POST] Processing template:', metaTemplate.name, 'status:', metaTemplate.status);
      
      try {
        // Extract full translation data from Meta template
        const translation = extractTranslationFromMetaTemplate(metaTemplate);

        // Check if template already exists (globally by name due to unique constraint)
        const existing = await prisma.messageTemplate.findFirst({
          where: { 
            name: metaTemplate.name,
          }
        });

        console.log('[Meta Templates POST] Existing template check for', metaTemplate.name, ':', existing ? 'FOUND (org: ' + existing.organizationId + ')' : 'NOT FOUND');

        if (existing) {
          // Update existing template with latest Meta info
          // Also update organizationId so it's visible to current org
          const currentStatus = existing.status;
          const newMetaStatus = metaTemplate.status === 'APPROVED' ? 'approved' : 
                         metaTemplate.status === 'REJECTED' ? 'rejected' : 'pending';
          
          // Always update status, but only update content if missing
          const shouldUpdateStatus = currentStatus !== newMetaStatus;
          const shouldUpdateContent = !existing.content;
          // Update orgId if template belongs to different org
          const shouldUpdateOrgId = existing.organizationId !== orgId;
          
          console.log(`[Meta Templates POST] Template ${existing.name}: local status="${currentStatus}", Meta status="${newMetaStatus}", updatingStatus=${shouldUpdateStatus}, updatingContent=${shouldUpdateContent}, updatingOrgId=${shouldUpdateOrgId}`);
          
          if (shouldUpdateStatus || shouldUpdateContent || shouldUpdateOrgId) {
            const updateData: any = {
              status: newMetaStatus,
              whatsappTemplateId: metaTemplate.id,
            };
            
            // Update organizationId if needed
            if (shouldUpdateOrgId) {
              updateData.organizationId = orgId;
            }
            
            if (shouldUpdateContent) {
              updateData.content = JSON.stringify([translation]);
              updateData.variables = JSON.stringify(extractVariablesFromBody(translation.body));
              updateData.category = metaTemplate.category?.toLowerCase() || 'marketing';
            }
            
            await prisma.messageTemplate.update({
              where: { id: existing.id },
              data: updateData
            });
            updated++;
          }
          skipped++;
        } else {
          // Create new template from Meta with complete translation data
          console.log(`[Meta Templates POST] Creating new template: ${metaTemplate.name}`);
          await prisma.messageTemplate.create({
            data: {
              name: metaTemplate.name,
              category: metaTemplate.category?.toLowerCase() || 'marketing',
              content: JSON.stringify([translation]),
              variables: JSON.stringify(extractVariablesFromBody(translation.body)),
              status: metaTemplate.status === 'APPROVED' ? 'approved' : 
                     metaTemplate.status === 'REJECTED' ? 'rejected' : 'pending',
              whatsappTemplateId: metaTemplate.id,
              organizationId: orgId,
              userId: token?.sub
            }
          });
          imported++;
        }
      } catch (templateError: any) {
        console.error(`Error syncing template ${metaTemplate.name}:`, templateError);
        errors.push(`${metaTemplate.name}: ${templateError.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalInMeta: metaTemplates.length,
      imported,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sync completed. ${imported} new templates imported, ${updated} updated. ${skipped} templates unchanged.`
    });

  } catch (error: any) {
    console.error('Error importing templates from Meta:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to import templates from Meta';
    let statusCode = 500;
    
    // Check for specific error types
    if (error.message?.includes('WhatsApp credentials not configured')) {
      errorMessage = 'WhatsApp is not connected. Please connect WhatsApp in Settings first.';
      statusCode = 400;
    } else if (error.message?.includes('access token')) {
      errorMessage = 'WhatsApp access token has expired. Please reconnect WhatsApp in Settings.';
      statusCode = 401;
    } else if (error.response?.data?.error?.message) {
      // Meta API returned an error
      errorMessage = `Meta API Error: ${error.response.data.error.message}`;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot connect to Meta API. Please check your internet connection.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
