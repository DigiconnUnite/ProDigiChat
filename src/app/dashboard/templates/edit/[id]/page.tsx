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

  // Fetch template data
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

  // Loading state
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

  // Error state
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

  // Check if template is approved
  // Note: This is a fallback check - the edit button should already be disabled for approved templates
  // But we keep this for security in case someone tries to access the URL directly
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
              // Navigate to duplicate functionality
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
      {/* Header  */}
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
