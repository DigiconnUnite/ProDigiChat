# WhatsApp Marketing Tool - Template System Documentation

This document provides complete code for all files responsible for handling templates in this WhatsApp Marketing platform.

---

## Table of Contents

1. [Frontend Pages](#frontend-pages)
2. [Frontend Components](#frontend-components)
3. [Backend API Routes](#backend-api-routes)
4. [Backend Services](#backend-services)
5. [Types & Database](#types--database)

---

## Frontend Pages

### 1. Main Manage Templates Page
**File:** `src/app/dashboard/templates/page.tsx`

```typescript
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import TemplateManagement from '@/components/templates/template-management';
import { TemplateWizard } from '@/components/templates/template-wizard';
import { TemplatePreview } from '@/components/templates/template-preview';
import { WhatsAppTemplate, CreateTemplateInput, TemplateVariable } from '@/types/template';
import { BookOpen, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type ViewMode = 'Manage' | 'create' | 'edit' | 'preview';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
                                                                         
function TemplatesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [viewMode, setViewMode] = useState<ViewMode>('Manage');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const getStatusFromParams = () => {
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== 'all' && statusParam !== '') {
      return statusParam;
    }
    return 'all';
  };

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all',
    status: getStatusFromParams(),
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const buildQueryString = useCallback((page?: number) => {
    const params = new URLSearchParams();
    
    if (filters.status && filters.status !== 'all') {
      params.set('status', filters.status);
    }
    
    if (filters.search) params.set('search', filters.search);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (page && page > 1) params.set('page', page.toString());
    params.set('limit', pagination.limit.toString());
    params.set('sortBy', 'updatedAt');
    params.set('sortOrder', 'desc');
    
    const queryString = params.toString();
    console.log('Fetching templates with query:', queryString || 'all (no filters)');
    return queryString;
  }, [filters, pagination.limit]);

  const fetchTemplates = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryString = buildQueryString(page);
      const response = await fetch(`/api/templates?${queryString}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
      
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch templates';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString]);

  useEffect(() => {
    fetchTemplates(1);
  }, [fetchTemplates]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category !== 'all') params.set('category', filters.category);
    if (filters.status !== 'all') params.set('status', filters.status);
    
    router.replace(`/dashboard/templates?${params.toString()}`, { scroll: false });
    fetchTemplates(1);
  }, [filters, router, fetchTemplates]);

  const handlePageChange = useCallback((page: number) => {
    fetchTemplates(page);
  }, [fetchTemplates]);

  const handleCreateNew = () => {
    router.push('/dashboard/templates/create');
  };

  const handleOpenLibrary = () => {
    router.push('/dashboard/templates/library');
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    console.log('Edit clicked - template status:', template.status, 'template:', template.name);
    
    if (template.status === 'approved') {
      toast.error('Cannot edit approved templates. Create a duplicate instead.');
      return;
    }
    router.push(`/dashboard/templates/edit/${template.id}`);
  };

  const handleDuplicate = async (template: WhatsAppTemplate) => {
    try {
      toast.loading('Duplicating template...');
      
      const newTemplate: CreateTemplateInput = {
        name: `${template.name}_copy`,
        category: template.category,
        translations: template.translations,
      };

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        toast.dismiss();
        toast.success('Template duplicated successfully');
        fetchTemplates(pagination.page);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to duplicate');
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Failed to duplicate template');
    }
  };

  const handleDelete = async (template: WhatsAppTemplate) => {
    if (template.status === 'approved') {
      toast.error('Cannot delete approved templates');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      toast.loading('Deleting template...');
      
      const response = await fetch(`/api/templates?id=${template.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.dismiss();
        toast.success('Template deleted successfully');
        fetchTemplates(pagination.page);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Failed to delete template');
    }
  };

  const handleViewDetails = (template: WhatsAppTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleCreateCampaign = (template: WhatsAppTemplate) => {
    router.push(`/dashboard/campaigns/create?templateId=${template.id}`);
  };

  const handleSave = async (data: CreateTemplateInput) => {
    try {
      const isEditing = !!editingTemplate;
      toast.loading(isEditing ? 'Updating template...' : 'Creating template...');
      
      const response = await fetch('/api/templates', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { ...data, id: editingTemplate.id } : data),
      });

      if (response.ok) {
        toast.dismiss();
        toast.success(
          isEditing 
            ? 'Template updated successfully' 
            : 'Template created successfully'
        );
        setViewMode('Manage');
        setEditingTemplate(null);
        router.push('/dashboard/templates');
        fetchTemplates(1);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Failed to save template');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/templates');
  };

  const extractVariables = (body: string): TemplateVariable[] => {
    const variableRegex = /\{\{(\d+)\}\}/g;
    const variables: TemplateVariable[] = [];
    let match;
    const foundIndexes = new Set<number>();
    
    while ((match = variableRegex.exec(body)) !== null) {
      const index = parseInt(match[1]);
      if (!foundIndexes.has(index)) {
        foundIndexes.add(index);
        variables.push({
          index,
          sampleValue: `Sample ${index}`,
        });
      }
    }
    
    return variables;
  };

  const handleRetry = () => {
    fetchTemplates(1);
  };

  const handleSyncFromMeta = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/templates/meta?import=true');
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }
      
      toast.success(data.message || 'Templates synced successfully');
      fetchTemplates(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync templates from Meta');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      {viewMode === 'Manage' && (
        <>
          <TemplateManagement
            templates={templates}
            onCreateNew={handleCreateNew}
            onOpenLibrary={handleOpenLibrary}
            onSyncFromMeta={handleSyncFromMeta}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            onCreateCampaign={handleCreateCampaign}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            isSyncing={isSyncing}
          />
        </>
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <TemplateWizard
          initialData={editingTemplate || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[100vh] overflow-y-auto flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-xl">
              {previewTemplate?.name}
            </SheetTitle>
          </SheetHeader>
          {previewTemplate && previewTemplate.translations.length > 0 && (
            <div className="py-4 flex-1 overflow-y-auto">
              <TemplatePreview
                preview={{
                  header: previewTemplate.translations[0].header,
                  body: previewTemplate.translations[0].body,
                  footer: previewTemplate.translations[0].footer,
                  buttons: previewTemplate.translations[0].buttons,
                  variables: extractVariables(previewTemplate.translations[0].body),
                }}
                className="flex justify-center"
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <TemplatesPageContent />
    </Suspense>
  );
}
```

### 2. Create Template Page
**File:** `src/app/dashboard/templates/create/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateWizard } from '@/components/templates/template-wizard';
import { CreateTemplateInput } from '@/types/template';
import { toast } from 'sonner';

export default function CreateTemplatePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: CreateTemplateInput) => {
    try {
      setIsSaving(true);
      toast.loading('Creating template...');
      
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.dismiss();
        toast.success('Template created successfully');
        router.push('/dashboard/templates');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/templates');
  };

  return (
    <div className="container mx-auto py-6">
      <TemplateWizard
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isSaving}
      />
    </div>
  );
}
```

### 3. Edit Template Page
**File:** `src/app/dashboard/templates/edit/[id]/page.tsx`

```typescript
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateWizard } from '@/components/templates/template-wizard';
import { WhatsAppTemplate, CreateTemplateInput } from '@/types/template';
import { toast } from 'sonner';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;
  
  const [template, setTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/templates?id=${templateId}`);
      
      if (!response.ok) {
        throw new Error('Template not found');
      }
      
      const data = await response.json();
      const templates = data.templates || [];
      
      if (templates.length === 0) {
        throw new Error('Template not found');
      }
      
      setTemplate(templates[0]);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load template';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSave = async (data: CreateTemplateInput) => {
    if (!template) return;
    
    try {
      setIsSaving(true);
      toast.loading('Updating template...');
      
      const response = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: template.id }),
      });

      if (response.ok) {
        toast.dismiss();
        toast.success('Template updated successfully');
        router.push('/dashboard/templates');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update template');
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/templates');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
            <p className="text-gray-500">Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="container mx-auto py-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard/templates')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </Button>
        
        <div className="border rounded-lg bg-white p-12 text-center">
          <h3 className="text-lg font-medium mb-2">Error Loading Template</h3>
          <p className="text-gray-500 mb-4">{error || 'Template not found'}</p>
          <Button onClick={() => router.push('/dashboard/templates')}>
            Return to Library
          </Button>
        </div>
      </div>
    );
  }

  if (template.status === 'approved') {
    return (
      <div className="container mx-auto py-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard/templates')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </Button>
        
        <div className="border rounded-lg bg-white p-12 text-center">
          <h3 className="text-lg font-medium mb-2">Cannot Edit Approved Template</h3>
          <p className="text-gray-500 mb-4">
            Current template status: <span className="font-bold text-red-600">{template.status}</span>
          </p>
          <p className="text-gray-500 mb-4">
            Approved templates cannot be edited. You can duplicate the template and edit the copy instead.
          </p>
          <Button 
            onClick={() => {
              router.push(`/dashboard/templates?action=duplicate&id=${template.id}`);
            }}
          >
            Duplicate Template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Template</h1>
        <p className="text-gray-500">
          Modify your template: <span className="font-mono">{template.name}</span>
        </p>
      </div>

      <TemplateWizard
        initialData={{
          name: template.name,
          category: template.category,
          translations: template.translations,
        }}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isSaving}
      />
    </div>
  );
}
```

---

## Frontend Components

### 1. Template Management Component (Summary)
**File:** `src/components/templates/template-management.tsx`

This is the main component that displays the template table. Key features:
- Template list with pagination (50, 100, 200 items per page)
- Search and filter by category/status
- Sort by name, category, status, updated date
- **"Sync from Meta" button** (green, prominent)
- Actions: View Details, Edit, Delete, Create Campaign
- Status badges (Approved=green, Pending=yellow, Rejected=red)
- Category badges (Marketing, Utility, Authentication)

### 2. Template Wizard Component (Summary)
**File:** `src/components/templates/template-wizard.tsx`

Multi-step wizard (4 steps):
1. **Name & Category** - Template name, category selection, language
2. **Content Builder** - Header (text/image/video/document), body, footer
3. **Buttons** - Quick reply or call-to-action buttons
4. **Sample Data** - Variable placeholder values for preview

Features:
- Real-time WhatsApp preview
- Variable detection ({{1}}, {{2}}, etc.)
- Markdown formatting support (bold, italic)
- Validation at each step

### 3. Template Preview Component (Summary)
**File:** `src/components/templates/template-preview.tsx`

WhatsApp-style phone mockup showing:
- iOS-style status bar
- Chat bubble with template preview
- Header (text/image/video/document)
- Body with formatting
- Footer
- Action buttons
- Delivery status icons

---

## Backend API Routes

### 1. Main Templates CRUD API
**File:** `src/app/api/templates/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppTemplate, CreateTemplateInput, UpdateTemplateInput, TemplateTranslation } from '@/types/template';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { submitTemplateToMeta, checkTemplateStatusFromMeta, deleteTemplateFromMeta } from '@/lib/whatsapp-template-service';

export async function GET(request: NextRequest) {
  // Fetch templates with filters: status, category, search
  // Supports pagination: page, limit
  // Supports sorting: sortBy, sortOrder
}

export async function POST(request: NextRequest) {
  // Create new template
  // Validates name format (lowercase, numbers, underscores)
  // Submits to Meta for approval
}

export async function PUT(request: NextRequest) {
  // Update existing template
  // Prevents editing approved templates
}

export async function DELETE(request: NextRequest) {
  // Delete template by ID
}

export async function PATCH(request: NextRequest) {
  // Check template status from Meta
  // Resubmit template to Meta
}
```

### 2. Meta Templates API (Complete)
**File:** `src/app/api/templates/meta/route.ts`

```typescript
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
  
  // Match named variables
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

  return { language, header, body, footer, buttons };
}

/**
 * GET endpoint to fetch templates from Meta and optionally import them
 * Query params:
 *   - import=true: Import templates to local database
 *   - force=true: Force update existing templates
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;
    
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);  
    const shouldImport = searchParams.get('import') === 'true';

    const credentials = await prisma.whatsAppCredential.findFirst({
      where: { organizationId: orgId, isActive: true }
    });

    if (!credentials) {
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please connect WhatsApp in Settings first.' },
        { status: 400 }
      );
    }

    const client = await getWhatsAppClient(orgId);
    const response = await client.getAllTemplates();
    const metaTemplates = response.data?.data || [];
    console.log('[Meta Templates] Found templates in Meta:', metaTemplates.length);

    if (shouldImport) {
      let imported = 0;
      let skipped = 0;
      let updated = 0;
      const forceUpdate = searchParams.get('force') === 'true';

      for (const metaTemplate of metaTemplates) {
        const translation = extractTranslationFromMetaTemplate(metaTemplate);

        const existing = await prisma.messageTemplate.findFirst({
          where: { 
            name: metaTemplate.name,
            OR: [{ organizationId: orgId }, { userId: token?.sub }]
          }
        });

        if (existing) {
          const currentStatus = existing.status;
          const newMetaStatus = metaTemplate.status === 'APPROVED' ? 'approved' : 
                         metaTemplate.status === 'REJECTED' ? 'rejected' : 'pending';
          
          const shouldUpdateStatus = currentStatus !== newMetaStatus;
          const shouldUpdateContent = forceUpdate || !existing.content;
          
          if (shouldUpdateStatus || shouldUpdateContent) {
            const updateData: any = {
              status: newMetaStatus,
              whatsappTemplateId: metaTemplate.id,
            };
            
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

    return NextResponse.json({
      success: true,
      templates: metaTemplates.map((t: any): t.id,
 => ({
        id        name: t.name,
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
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates from Meta' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to import templates from Meta into local database
 */
export async function POST(request: NextRequest) {
  // Similar to GET with import=true
}
```

### 3. Template Sync API
**File:** `src/app/api/templates/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkTemplateStatusFromMeta } from "@/lib/whatsapp-template-service";
import { getToken } from "next-auth/jwt";

/**
 * API route to sync template statuses with Meta
 * 
 * GET /api/templates/sync?status=pending - Sync only pending templates
 * GET /api/templates/sync - Sync all templates with Meta IDs
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;
    
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const where: any = {
      whatsappTemplateId: { not: null },
      organizationId: orgId,
    };

    if (status && status !== "all") {
      where.status = status;
    } else {
      where.status = "pending";
    }

    const templatesToSync = await prisma.messageTemplate.findMany({
      where,
      select: { id: true, name: true, whatsappTemplateId: true, status: true },
    });

    if (templatesToSync.length === 0) {
      return NextResponse.json({ message: "No templates to sync", synced: 0, results: [] });
    }

    const results = await Promise.allSettled(
      templatesToSync.map(async (template) => {
        try {
          const metaStatus = await checkTemplateStatusFromMeta(template.whatsappTemplateId!, orgId);

          await prisma.messageTemplate.update({
            where: { id: template.id },
            data: { status: metaStatus.status },
          });

          return {
            id: template.id,
            name: template.name,
            previousStatus: template.status,
            newStatus: metaStatus.status,
            success: true,
            qualityScore: metaStatus.qualityScore,
            rejectionReason: metaStatus.rejectionReason,
          };
        } catch (error: any) {
          return { id: template.id, name: template.name, previousStatus: template.status, success: false, error: error.message };
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - successful;

    return NextResponse.json({
      message: `Sync completed: ${successful} successful, ${failed} failed`,
      total: results.length,
      successful,
      failed,
      results: results.map((r) => r.status === "fulfilled" ? r.value : { error: r.reason }),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to sync templates" }, { status: 500 });
  }
}
```

---

## Backend Services

### 1. WhatsApp Template Service
**File:** `src/lib/whatsapp-template-service.ts`

```typescript
import { WhatsAppClient, MetaTemplate, MetaTemplateStatus } from "@/app/api/whatsapp/client";
import { whatsappClient } from "@/app/api/whatsapp/auth";
import { WhatsAppTemplate, TemplateTranslation, TemplateCategory } from "@/types/template";

export function convertToMetaTemplate(template: WhatsAppTemplate, translation: TemplateTranslation): MetaTemplate {
  const components: any[] = [];

  if (translation.header) {
    const headerComponent: any = { type: "HEADER" };
    if (translation.header.type === "text" && translation.header.text) {
      headerComponent.format = "TEXT";
      headerComponent.text = translation.header.text;
    } else if (translation.header.type === "image" && translation.header.mediaUrl) {
      headerComponent.format = "IMAGE";
      headerComponent.example = { header_handle: [translation.header.mediaUrl] };
    } else if (translation.header.type === "video" && translation.header.mediaUrl) {
      headerComponent.format = "VIDEO";
      headerComponent.example = { header_handle: [translation.header.mediaUrl] };
    } else if (translation.header.type === "document" && translation.header.mediaUrl) {
      headerComponent.format = "DOCUMENT";
      headerComponent.example = { header_handle: [translation.header.mediaUrl] };
    }
    components.push(headerComponent);
  }

  if (translation.body) {
    components.push({ type: "BODY", text: translation.body });
  }

  if (translation.footer) {
    components.push({ type: "FOOTER", text: translation.footer });
  }

  if (translation.buttons && translation.buttons.length > 0) {
    const buttons = translation.buttons.map((btn) => {
      if (btn.type === "quick_reply") {
        return { type: "QUICK_REPLY" as const, text: btn.text };
      } else if (btn.type === "call_to_action") {
        if (btn.actionType === "url") {
          return { type: "URL" as const, text: btn.text, url: btn.actionValue || "" };
        } else if (btn.actionType === "phone") {
          return { type: "PHONE_NUMBER" as const, text: btn.text, phone_number: btn.actionValue || "" };
        }
      }
      return { type: "QUICK_REPLY" as const, text: btn.text };
    });
    components.push({ type: "BUTTONS", buttons });
  }

  const categoryMap: Record<TemplateCategory, "MARKETING" | "UTILITY" | "AUTHENTICATION"> = {
    marketing: "MARKETING",
    utility: "UTILITY",
    authentication: "AUTHENTICATION",
  };

  return {
    name: template.name,
    category: categoryMap[template.category] || "MARKETING",
    components,
    language: translation.language || "en_US",
    allow_category_selection: true,
  };
}

export function convertMetaStatus(metaStatus: string): "draft" | "pending" | "approved" | "rejected" {
  const statusMap: Record<string, any> = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    PAUSED: "approved",
    DELETED: "rejected",
  };
  return statusMap[metaStatus] || "pending";
}

export async function submitTemplateToMeta(template: WhatsAppTemplate, orgId?: string, accountId?: string) {
  const translation = template.translations[0];
  if (!translation) throw new Error("Template has no translations");
  
  const metaTemplate = convertToMetaTemplate(template, translation);
  const response = await whatsappClient.submitTemplate(metaTemplate, orgId, accountId);
  
  return {
    success: true,
    metaTemplateId: response.data?.id,
  };
}

export async function checkTemplateStatusFromMeta(metaTemplateId: string, orgId?: string, accountId?: string) {
  const response = await whatsappClient.getTemplateStatus(metaTemplateId, orgId, accountId);
  const metaStatus = response.data;
  
  return {
    status: convertMetaStatus(metaStatus.status),
    qualityScore: metaStatus.quality_score,
    rejectionReason: metaStatus.rejection_reason,
  };
}

export async function syncTemplatesWithMeta(orgId?: string, accountId?: string) {
  const response = await whatsappClient.getAllTemplates(undefined, orgId, accountId);
  const metaTemplates = response.data?.data || [];
  return { success: true, synced: metaTemplates.length, errors: [] };
}

export async function deleteTemplateFromMeta(metaTemplateId: string, orgId?: string, accountId?: string) {
  try {
    await whatsappClient.deleteTemplate(metaTemplateId, orgId, accountId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

---

## Types & Database

### 1. Template Types
**File:** `src/types/template.ts`

```typescript
export type TemplateCategory = 'marketing' | 'utility' | 'authentication';
export type TemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type HeaderType = 'text' | 'image' | 'video' | 'document';
export type ButtonType = 'quick_reply' | 'call_to_action';
export type ActionType = 'url' | 'phone';

export interface TemplateVariable {
  index: number;
  sampleValue: string;
}

export interface HeaderContent {
  type: HeaderType;
  text?: string;
  mediaUrl?: string;
  filename?: string;
}

export interface Button {
  id: string;
  type: ButtonType;
  text: string;
  actionType?: ActionType;
  actionValue?: string;
}

export interface TemplateTranslation {
  language: string;
  header?: HeaderContent;
  body: string;
  footer?: string;
  buttons: Button[];
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  qualityRating?: number;
  rejectionReason?: string;
  translations: TemplateTranslation[];
  createdAt: Date;
  updatedAt: Date;
  metaTemplateId?: string;
}

export interface CreateTemplateInput {
  name: string;
  category: TemplateCategory;
  translations: TemplateTranslation[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string;
}

export interface TemplateFilters {
  status?: TemplateStatus;
  category?: TemplateCategory;
  search?: string;
}

export interface TemplatePreviewProps {
  header?: HeaderContent;
  body: string;
  footer?: string;
  buttons: Button[];
  variables: TemplateVariable[];
}
```

---

## Summary

| Category | Files | Purpose |
|----------|-------|---------|
| Pages | 4 | Manage, Library, Create, Edit templates |
| Components | 3 | Table, Wizard, Preview |
| API Routes | 3 | CRUD, Meta sync, Status sync |
| Services | 1 | Template utilities |
| Types | 1 | TypeScript interfaces |

The template system enables:
- Creating WhatsApp message templates with visual wizard
- Syncing ALL templates from Meta WABA (including hello_world)
- Managing template approval status
- Using templates in campaigns
