import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppTemplate, CreateTemplateInput, UpdateTemplateInput, TemplateTranslation } from '@/types/template';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { submitTemplateToMeta, checkTemplateStatusFromMeta, deleteTemplateFromMeta } from '@/lib/whatsapp-template-service';

// Types for query parameters
type SortField = 'name' | 'category' | 'status' | 'updatedAt' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub as string | undefined;
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;

    if (!userId && !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build user/org filter for queries
    const userOrgFilter: any = userId ? {
      OR: [
        { userId: userId },
        { organizationId: orgId }
      ]
    } : { organizationId: orgId };

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Debug log
    console.log('Template API - Request params:', { status, category, search, page, limit });

    // Build where clause
    const where: any = userOrgFilter;
    
    if (status && status !== 'all' && status.trim() !== '') {
      where.status = status;
      console.log('Applying status filter:', status);
    } else {
      console.log('No status filter - returning all templates');
    }
    if (category && category !== 'all') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.messageTemplate.count({ where });

    // Get templates from database
    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Debug: Log what we're returning
    console.log('Found templates:', templates.map(t => ({ name: t.name, status: t.status })));

    // Convert database model to API response format
    const formattedTemplates = templates.map((t) => {
      let translations: any[] = [];
      try {
        translations = JSON.parse(t.content);
      } catch {
        // If content is not valid JSON, treat it as a simple body text
        translations = [{ body: t.content || '', language: 'en' }];
      }

      let variables: string[] = [];
      try {
        variables = JSON.parse(t.variables);
      } catch {
        variables = [];
      }

      return {
        id: t.id,
        name: t.name,
        category: t.category,
        status: t.status,
        qualityRating: t.whatsappTemplateId ? 0 : undefined,
        metaTemplateId: t.whatsappTemplateId,
        hasWhatsAppId: !!t.whatsappTemplateId,  // Add flag to show if template is in Meta
        translations,
        variables,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    return NextResponse.json({
      templates: formattedTemplates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub as string | undefined;
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;

    if (!userId && !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateTemplateInput = await request.json();

    // Validate required fields
    if (!body.name || !body.category || !body.translations?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, and translations are required' },
        { status: 400 }
      );
    }

    // Validate template name format
    if (!/^[a-z][a-z0-9_]*$/.test(body.name)) {
      return NextResponse.json(
        { error: 'Invalid template name format. Use lowercase letters, numbers, and underscores only.' },
        { status: 400 }
      );
    }

    // Check for duplicate name in database - only within user's organization
    try {
      const existingTemplate = await prisma.messageTemplate.findFirst({
        where: { 
          name: body.name,
          OR: [
            { userId: userId as string },
            { organizationId: orgId as string }
          ]
        } as any,
      });

      if (existingTemplate) {
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 400 }
        );
      }
    } catch (error) {
      // Ignore duplicate check errors - the create will fail if there's a real duplicate
    }

    // Create template in database first
    const newTemplate = await prisma.messageTemplate.create({
      data: {
        name: body.name,
        category: body.category,
        content: JSON.stringify(body.translations),
        variables: JSON.stringify(extractVariables(body.translations)),
        status: 'pending',
        userId: userId,
        organizationId: orgId,
      } as any,
    });

    // Try to submit to Meta (this is optional - local template is still created)
    let metaTemplateId: string | undefined;
    let metaSubmitSuccess = false;

    try {
      const templateToSubmit: WhatsAppTemplate = {
        id: newTemplate.id,
        name: newTemplate.name,
        category: newTemplate.category as any,
        status: 'pending',
        translations: body.translations,
        createdAt: newTemplate.createdAt,
        updatedAt: newTemplate.updatedAt,
      };

      const metaResult = await submitTemplateToMeta(templateToSubmit, orgId);
      
      if (metaResult.success && metaResult.metaTemplateId) {
        metaTemplateId = metaResult.metaTemplateId;
        metaSubmitSuccess = true;

        // Update with Meta template ID
        await prisma.messageTemplate.update({
          where: { id: newTemplate.id },
          data: {
            whatsappTemplateId: metaTemplateId,
          },
        });
      }
    } catch (metaError: any) {
      console.error('Failed to submit template to Meta:', metaError);
      // Continue - local template is still valid
    }

    console.log('Template created:', newTemplate.name);

    return NextResponse.json({
      template: {
        id: newTemplate.id,
        name: newTemplate.name,
        category: newTemplate.category,
        status: newTemplate.status,
        translations: body.translations,
        metaTemplateId,
        createdAt: newTemplate.createdAt,
        updatedAt: newTemplate.updatedAt,
      },
      message: metaSubmitSuccess
        ? 'Template created and submitted to Meta for approval'
        : 'Template created locally. Submission to Meta failed - you can retry later.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// Helper function to extract variables from translations
function extractVariables(translations: TemplateTranslation[]): string[] {
  const variables = new Set<string>();
  
  for (const translation of translations) {
    if (translation.body) {
      // Match {{1}}, {{2}}, etc.
      const matches = translation.body.match(/\{\{\d+\}\}/g);
      if (matches) {
        matches.forEach(m => variables.add(m));
      }
    }
  }
  
  return Array.from(variables);
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub as string | undefined;
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;

    if (!userId && !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateTemplateInput = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Find template in database - only if it belongs to user's organization
    const existingTemplate = await prisma.messageTemplate.findFirst({
      where: { 
        id: body.id,
        OR: [
          { userId: userId as string },
          { organizationId: orgId as string }
        ]
      } as any,
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // If template is already approved by Meta, it cannot be edited
    if (existingTemplate.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot edit approved templates. Create a new version instead.' },
        { status: 403 }
      );
    }

    // Update template in database
    const updatedTemplate = await prisma.messageTemplate.update({
      where: { id: body.id },
      data: {
        name: body.name || existingTemplate.name,
        category: body.category || existingTemplate.category,
        content: body.translations ? JSON.stringify(body.translations) : existingTemplate.content,
        variables: body.translations ? JSON.stringify(extractVariables(body.translations)) : existingTemplate.variables,
        status: 'pending', // Reset to pending when modified
        whatsappTemplateId: null, // Clear Meta ID to resubmit
      },
    });

    // Try to resubmit to Meta
    let metaSubmitSuccess = false;
    let metaTemplateId: string | undefined;

    if (existingTemplate.whatsappTemplateId) {
      try {
        const templateToSubmit: WhatsAppTemplate = {
          id: updatedTemplate.id,
          name: updatedTemplate.name,
          category: updatedTemplate.category as any,
          status: 'pending',
          translations: body.translations || JSON.parse(updatedTemplate.content),
          createdAt: updatedTemplate.createdAt,
          updatedAt: updatedTemplate.updatedAt,
        };

        const metaResult = await submitTemplateToMeta(templateToSubmit, orgId);
        
        if (metaResult.success && metaResult.metaTemplateId) {
          metaTemplateId = metaResult.metaTemplateId;
          metaSubmitSuccess = true;

          await prisma.messageTemplate.update({
            where: { id: updatedTemplate.id },
            data: { whatsappTemplateId: metaTemplateId },
          });
        }
      } catch (metaError: any) {
        console.error('Failed to resubmit template to Meta:', metaError);
      }
    }

    console.log('Template updated:', updatedTemplate.name);

    return NextResponse.json({
      template: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        category: updatedTemplate.category,
        status: updatedTemplate.status,
        metaTemplateId: metaTemplateId || existingTemplate.whatsappTemplateId,
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt,
      },
      message: metaSubmitSuccess
        ? 'Template updated and resubmitted to Meta for approval'
        : 'Template updated locally. Resubmission to Meta failed.',
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request });
  const userId = token?.sub as string | undefined;
  const orgId = (token?.organizationId || token?.orgId) as string | undefined;

  if (!userId && !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Template ID is required' },
      { status: 400 }
    );
  }

  // Find template in database - only if it belongs to user's organization
  const existingTemplate = await prisma.messageTemplate.findFirst({
    where: { 
      id,
      OR: [
        { userId: userId as string },
        { organizationId: orgId as string }
      ]
    } as any,
  });

  if (!existingTemplate) {
    return NextResponse.json(
      { error: 'Template not found' },
      { status: 404 }
    );
  }

  // Only allow deletion of non-approved templates
  if (existingTemplate.status === 'approved') {
    return NextResponse.json(
      { error: 'Cannot delete approved templates. Contact support.' },
      { status: 403 }
    );
  }

  const templateName = existingTemplate.name;
  const whatsappTemplateId = existingTemplate.whatsappTemplateId;

  // Try to delete from Meta if it exists there
  if (whatsappTemplateId) {
    try {
      const deleteResult = await deleteTemplateFromMeta(whatsappTemplateId, orgId);
      if (deleteResult.success) {
        console.log('Template deleted from Meta:', templateName);
      } else {
        console.log('Template NOT deleted from Meta (may still exist in Meta):', templateName, deleteResult.error);
      }
    } catch (metaError) {
      console.error('Failed to delete template from Meta:', metaError);
    }
  }

  // Delete from database
  await prisma.messageTemplate.delete({
    where: { id },
  });

  console.log('Template deleted locally:', templateName);
  console.log('Note: If template still exists in Meta, it will be re-imported when you sync. To prevent this, please delete the template from Meta Business Manager as well.');

  return NextResponse.json({
    message: 'Template deleted successfully',
  });
}

// New endpoint to check template status with Meta
export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub as string | undefined;
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;

    if (!userId && !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, action } = body;

    if (!templateId || !action) {
      return NextResponse.json(
        { error: 'Template ID and action are required' },
        { status: 400 }
      );
    }

    if (action === 'checkStatus') {
      // Get template from database - only if it belongs to user's organization
      const template = await prisma.messageTemplate.findFirst({
        where: { 
          id: templateId,
          OR: [
            { userId: userId },
            { organizationId: orgId }
          ]
        } as any,
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      if (!template.whatsappTemplateId) {
        return NextResponse.json(
          { error: 'Template has not been submitted to Meta yet' },
          { status: 400 }
        );
      }

      // Check status with Meta
      const metaStatus = await checkTemplateStatusFromMeta(template.whatsappTemplateId, orgId);

      // Update local database with latest status
      await prisma.messageTemplate.update({
        where: { id: templateId },
        data: {
          status: metaStatus.status,
        },
      });

      return NextResponse.json({
        status: metaStatus.status,
        qualityScore: metaStatus.qualityScore,
        rejectionReason: metaStatus.rejectionReason,
      });
    }

    if (action === 'resubmit') {
      // Get template from database - only if it belongs to user's organization
      const template = await prisma.messageTemplate.findFirst({
        where: { 
          id: templateId,
          OR: [
            { userId: userId },
            { organizationId: orgId }
          ]
        } as any,
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // Parse content
      let translations: any[] = [];
      try {
        translations = JSON.parse(template.content);
      } catch {
        translations = [{ body: template.content, language: 'en' }];
      }

      // Submit to Meta
      const templateToSubmit: WhatsAppTemplate = {
        id: template.id,
        name: template.name,
        category: template.category as any,
        status: template.status as any,
        translations,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };

      const metaResult = await submitTemplateToMeta(templateToSubmit, orgId);

      if (metaResult.success && metaResult.metaTemplateId) {
        await prisma.messageTemplate.update({
          where: { id: templateId },
          data: {
            whatsappTemplateId: metaResult.metaTemplateId,
            status: 'pending',
          },
        });

        return NextResponse.json({
          success: true,
          metaTemplateId: metaResult.metaTemplateId,
          message: 'Template resubmitted to Meta successfully',
        });
      }

      return NextResponse.json(
        { error: metaResult.error || 'Failed to resubmit template to Meta' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing template action:', error);
    return NextResponse.json(
      { error: 'Failed to process template action' },
      { status: 500 }
    );
  }
}
