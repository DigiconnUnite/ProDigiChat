'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, GripVertical, X, Upload, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplatePreview } from './template-preview';
import {
  CreateTemplateInput,
  TemplateTranslation,
  HeaderContent,
  Button as ButtonType,
  TemplateVariable,
  TemplateCategory,
  HeaderType,
  ButtonType as ButtonCategory
} from '@/types/template';
import { cn } from '@/lib/utils';
import StripesBackground from '../ui/StripesBackground';

interface TemplateWizardProps {
  initialData?: Partial<CreateTemplateInput>;
  onSave: (data: CreateTemplateInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Name & Category', description: 'Basic template information' },
  { id: 2, title: 'Content Builder', description: 'Design your message' },
  { id: 3, title: 'Buttons', description: 'Add interactive buttons' },
  { id: 4, title: 'Sample Data', description: 'Preview with sample values' },
];

export function TemplateWizard({ initialData, onSave, onCancel, isLoading = false }: TemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: initialData?.name || '',
    category: initialData?.category || 'marketing',
    translations: initialData?.translations || [{
      language: 'en',
      header: { type: 'text' },
      body: '',
      footer: '',
      buttons: [],
    }],
  });

  // Current translation being edited
  const currentTranslation = formData.translations[0];
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Extract variables from body text
  useEffect(() => {
    const bodyText = currentTranslation?.body || '';
    const regex = /\{\{(\d+)\}\}/g;
    const matches = [...bodyText.matchAll(regex)];
    const foundIndices = new Set(matches.map(m => parseInt(m[1])));

    const newVariables: TemplateVariable[] = [];
    foundIndices.forEach(index => {
      const existing = variables.find(v => v.index === index);
      newVariables.push(existing || { index, sampleValue: '' });
    });
    setVariables(newVariables);
  }, [currentTranslation?.body]);

  const updateFormData = (updates: Partial<CreateTemplateInput>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateTranslation = (updates: Partial<TemplateTranslation>) => {
    setFormData(prev => ({
      ...prev,
      translations: prev.translations.map((t, i) =>
        i === 0 ? { ...t, ...updates } : t
      ),
    }));
  };

  const updateHeader = (updates: Partial<HeaderContent>) => {
    const newHeader = { ...currentTranslation.header, ...updates } as HeaderContent;
    updateTranslation({ header: newHeader });
  };

  const addButton = () => {
    const newButton: ButtonType = {
      id: `btn-${Date.now()}`,
      type: 'quick_reply',
      text: '',
    };
    updateTranslation({ buttons: [...currentTranslation.buttons, newButton] });
  };

  const updateButton = (buttonId: string, updates: Partial<ButtonType>) => {
    updateTranslation({
      buttons: currentTranslation.buttons.map(btn =>
        btn.id === buttonId ? { ...btn, ...updates } : btn
      ),
    });
  };

  const removeButton = (buttonId: string) => {
    updateTranslation({
      buttons: currentTranslation.buttons.filter(btn => btn.id !== buttonId),
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = 'Template name is required';
        } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
          newErrors.name = 'Name must be lowercase, start with letter, and use only underscores';
        }
        if (!formData.category) {
          newErrors.category = 'Please select a category';
        }
        break;
      case 2:
        if (!currentTranslation?.body.trim()) {
          newErrors.body = 'Message body is required';
        } else if (currentTranslation.body.length > 1024) {
          newErrors.body = 'Body text cannot exceed 1024 characters';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = () => {
    if (validateStep(currentStep)) {
      onSave(formData);
    }
  };

  // Build preview data
  const previewData = {
    header: currentTranslation?.header,
    body: currentTranslation?.body || 'Your message preview will appear here...',
    footer: currentTranslation?.footer,
    buttons: currentTranslation?.buttons || [],
    variables,
  };

  return (
    <div className="w-full h-full max-w-[1440px] mx-auto">
      {/* Main Content */}
      <div className={`grid gap-0 transition-all duration-300 ${isSidebarOpen ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Left Panel - Form Sections */}
        <div className={`${isSidebarOpen ? 'lg:col-span-2' : 'col-span-1'} flex flex-col h-[calc(100vh-80px)]`}>
          {/* Fixed Header */}
          <div className="sticky top-0 bg-background z-10 px-6 pt-4 pb-4 mb-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Template Details</h2>
                <p className="text-sm text-muted-foreground">Fill in all sections to create your template</p>
              </div>
              
              {/* Sidebar Toggle Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="shrink-0 hover:bg-muted"
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 scrollbar-hide overflow-y-auto px-6 pr-2 space-y-6">

          {/* Step 1: Name & Category Card */}
          <Card className="border-2 border-green-950 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-950 text-white flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                Name & Category
              </CardTitle>
              <p className="text-sm text-muted-foreground">Basic template information</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., welcome_offer_01"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  className={cn(errors.name && 'border-red-500')}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                <p className="text-xs text-muted-foreground">
                  Lowercase, alphanumeric with underscores only. Must start with a letter.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => updateFormData({ category: value as TemplateCategory })}
                >
                  <SelectTrigger className={cn(errors.category && 'border-red-500')}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="utility">Utility</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Content Builder Card */}
          <Card className="border-2 border-green-950 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-950 text-white flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                Content Builder
              </CardTitle>
              <p className="text-sm text-muted-foreground">Design your message</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Header Type</Label>
                <Select
                  value={currentTranslation?.header?.type || 'none'}
                  onValueChange={(value) => updateHeader({ type: value as HeaderType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Header</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentTranslation?.header?.type === 'text' && (
                <div className="space-y-2">
                  <Label>Header Text</Label>
                  <Input
                    placeholder="Enter header text (max 60 characters)"
                    value={currentTranslation.header.text || ''}
                    onChange={(e) => updateHeader({ text: e.target.value })}
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    {currentTranslation.header.text?.length || 0}/60 characters
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="body">Message Body *</Label>
                <Textarea
                  id="body"
                  placeholder="Enter your message content. Use {{1}}, {{2}} for variables."
                  value={currentTranslation?.body || ''}
                  onChange={(e) => updateTranslation({ body: e.target.value })}
                  className={cn(errors.body && 'border-red-500')}
                  rows={6}
                />
                {errors.body && <p className="text-sm text-red-500">{errors.body}</p>}
                <p className="text-xs text-muted-foreground">
                  {currentTranslation?.body?.length || 0}/1024 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Footer</Label>
                <Input
                  placeholder="Optional footer text (max 60 characters)"
                  value={currentTranslation?.footer || ''}
                  onChange={(e) => updateTranslation({ footer: e.target.value })}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {currentTranslation?.footer?.length || 0}/60 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Buttons Card */}
          <Card className="border-2 border-green-950 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-950 text-white flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                Buttons
              </CardTitle>
              <p className="text-sm text-muted-foreground">Add interactive buttons</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label>Buttons</Label>
                <Button type="button" variant="outline" size="sm" onClick={addButton}>
                  <Plus className="w-4 h-4 mr-1" /> Add Button
                </Button>
              </div>

              {currentTranslation?.buttons.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                  <p className="text-muted-foreground">No buttons added yet</p>
                  <p className="text-xs text-muted-foreground">Add quick reply or call-to-action buttons</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentTranslation?.buttons.map((button, index) => (
                    <Card key={button.id} className="border border-green-950/30 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move mt-2" />
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <Select
                                value={button.type}
                                onValueChange={(v) => updateButton(button.id, { type: v as ButtonCategory })}
                              >
                                <SelectTrigger className="w-full sm:w-[160px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="quick_reply">Quick Reply</SelectItem>
                                  <SelectItem value="call_to_action">Call to Action</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Button text"
                                value={button.text}
                                onChange={(e) => updateButton(button.id, { text: e.target.value })}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeButton(button.id)}
                                className="shrink-0"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>

                            {button.type === 'call_to_action' && (
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Select
                                  value={button.actionType || 'url'}
                                  onValueChange={(v) => updateButton(button.id, { actionType: v as any })}
                                >
                                  <SelectTrigger className="w-full sm:w-[160px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="url">Visit Website</SelectItem>
                                    <SelectItem value="phone">Call Number</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder={button.actionType === 'phone' ? '+1234567890' : 'https://example.com'}
                                  value={button.actionValue || ''}
                                  onChange={(e) => updateButton(button.id, { actionValue: e.target.value })}
                                  className="flex-1"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Maximum 3 quick reply buttons or 2 call-to-action buttons.
                Marketing templates should include at least one CTA button.
              </p>
            </CardContent>
          </Card>

          {/* Step 4: Sample Data Card */}
          <Card className="border-2 border-green-950 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-950 text-white flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                Sample Data
              </CardTitle>
              <p className="text-sm text-muted-foreground">Preview with sample values</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-yellow-800">Sample Data Required</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Meta requires sample values for all variables to preview your template.
                </p>
              </div>

              {variables.length === 0 ? (
                <div className="text-center py-8 bg-gray-50/30 rounded-lg border border-gray-200/50">
                  <p className="text-muted-foreground">No variables detected in your template body</p>
                  <p className="text-sm text-muted-foreground">Add {'{{1}}'}, {'{{2}}'}, etc. in the body text</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variables.map((variable) => (
                    <div key={variable.index} className="space-y-2">
                      <Label className="text-sm font-medium">Variable {'{{' + variable.index + '}}'}</Label>
                      <Input
                        placeholder={`Sample value for {{${variable.index}}}`}
                        value={variable.sampleValue}
                        onChange={(e) => setVariables(prev =>
                          prev.map(v => v.index === variable.index
                            ? { ...v, sampleValue: e.target.value }
                            : v
                          )
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Fixed Action Buttons */}
          <div className="sticky bottom-0 bg-background z-10 px-6 pt-4 pb-4 border-t border-b border-border shrink-0">
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-green-950 hover:bg-green-800 text-white min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Submit for Approval'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        {isSidebarOpen && (
          <div className="lg:col-span-1 z-20 border sticky top-6 h-[calc(100vh-80px)] overflow-hidden bg-gradient-to-br from-lime-50 to-green-50">
            <StripesBackground position="full" opacity="opacity-10" />
            <div className="h-full flex items-center justify-center p-6">
              <TemplatePreview
                preview={{
                  header: currentTranslation?.header,
                  body: currentTranslation?.body || 'Your message will appear here...',
                  footer: currentTranslation?.footer,
                  buttons: currentTranslation?.buttons,
                  variables: variables,
                }}
                className="flex justify-center"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TemplateWizard;
