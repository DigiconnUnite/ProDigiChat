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
    // Only use the param if it's a valid status value (not 'all')
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

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Build query string from filters
  const buildQueryString = useCallback((page?: number) => {
    const params = new URLSearchParams();
    
    // Only add status filter if it's explicitly set and not 'all'
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

  // Initial fetch
  useEffect(() => {
    fetchTemplates(1);
  }, [fetchTemplates]);

  // Handle filter changes
  useEffect(() => {
    // Update URL with filters
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category !== 'all') params.set('category', filters.category);
    if (filters.status !== 'all') params.set('status', filters.status);
    
    router.replace(`/dashboard/templates?${params.toString()}`, { scroll: false });
    fetchTemplates(1);
  }, [filters, router, fetchTemplates]);

  // Handle page change from library component
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
    // Navigate to campaign creation with template pre-selected
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

  // Helper function to extract variables from template body
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

  // Sync templates from Meta
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
    <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6">
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

      {/* Template Preview Drawer */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[100vh] overflow-y-auto flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-xl">
              {previewTemplate?.name}
            </SheetTitle>
          </SheetHeader>
          {previewTemplate && previewTemplate.translations.length > 0 && (
            <div className="py-4 flex-1 overflow-y-auto">
              {/* Template Preview - show first translation */}
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
