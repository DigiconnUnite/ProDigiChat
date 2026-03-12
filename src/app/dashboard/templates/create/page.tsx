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
