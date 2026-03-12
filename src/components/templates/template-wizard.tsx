'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, GripVertical, X, Upload, Loader2 } from 'lucide-react';
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
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Wizard Panel */}
      <div className="flex-1 overflow-y-auto">
        {/* Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-medium',
                      currentStep >= step.id
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  <p className="text-xs mt-1 text-center hidden sm:block">{step.title}</p>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-1 mx-2',
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{WIZARD_STEPS[currentStep - 1].title}</CardTitle>
            <p className="text-sm text-gray-500">{WIZARD_STEPS[currentStep - 1].description}</p>
          </CardHeader>
          <CardContent>
            {/* Step 1: Name & Category */}
            {currentStep === 1 && (
              <div className="space-y-4">
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
                  <p className="text-xs text-gray-500">
                    Lowercase, alphanumeric with underscores only. Must start with a letter.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Tabs value={formData.category} onValueChange={(v) => updateFormData({ category: v as TemplateCategory })}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="marketing">Marketing</TabsTrigger>
                      <TabsTrigger value="utility">Utility</TabsTrigger>
                      <TabsTrigger value="authentication">Auth</TabsTrigger>
                    </TabsList>
                    <TabsContent value="marketing" className="text-sm text-gray-500 mt-2">
                      Promotions, newsletters, announcements, special offers
                    </TabsContent>
                    <TabsContent value="utility" className="text-sm text-gray-500 mt-2">
                      Order confirmations, delivery alerts, account notifications
                    </TabsContent>
                    <TabsContent value="authentication" className="text-sm text-gray-500 mt-2">
                      One-time passwords (OTP), login verification codes
                    </TabsContent>
                  </Tabs>
                  {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Primary Language</Label>
                  <Select 
                    value={currentTranslation?.language} 
                    onValueChange={(lang) => updateTranslation({ language: lang })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Content Builder */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-3">
                  <Label>Header (Optional)</Label>
                  <Tabs 
                    value={currentTranslation?.header?.type || 'none'} 
                    onValueChange={(v) => updateHeader({ type: v as HeaderType, mediaUrl: undefined })}
                  >
                    <TabsList>
                      <TabsTrigger value="none">None</TabsTrigger>
                      <TabsTrigger value="text">Text</TabsTrigger>
                      <TabsTrigger value="image">Image</TabsTrigger>
                      <TabsTrigger value="video">Video</TabsTrigger>
                      <TabsTrigger value="document">Document</TabsTrigger>
                    </TabsList>
                    <TabsContent value="text" className="mt-3">
                      <Input
                        placeholder="Header text..."
                        value={currentTranslation?.header?.text || ''}
                        onChange={(e) => updateHeader({ text: e.target.value })}
                      />
                    </TabsContent>
                    <TabsContent value="image" className="mt-3">
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Upload an image for the header</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Choose File
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="video" className="mt-3">
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Upload a video for the header</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Choose File
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="document" className="mt-3">
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Upload a PDF document</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Choose File
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Body *</Label>
                    <Badge variant="outline">{currentTranslation?.body.length || 0}/1024</Badge>
                  </div>
                  <Textarea
                    placeholder="Hi {{1}}, your discount code is {{2}}"
                    value={currentTranslation?.body || ''}
                    onChange={(e) => updateTranslation({ body: e.target.value })}
                    className={cn('min-h-[150px]', errors.body && 'border-red-500')}
                  />
                  {errors.body && <p className="text-sm text-red-500">{errors.body}</p>}
                  <p className="text-xs text-gray-500">
                    Use {'{{1}}'}, {'{{2}}'}, etc. for variables. Support **bold**, *italic*, and `monospace`
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateTranslation({ body: currentTranslation?.body + ' {{1}}' })}
                    >
                      Add Variable {'{{1}}'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateTranslation({ body: currentTranslation?.body + ' {{2}}' })}
                    >
                      Add Variable {'{{2}}'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateTranslation({ body: currentTranslation?.body + ' **text**' })}
                    >
                      Bold
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateTranslation({ body: currentTranslation?.body + ' *text*' })}
                    >
                      Italic
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className="space-y-2">
                  <Label>Footer (Optional)</Label>
                  <Input
                    placeholder="Reply STOP to unsubscribe"
                    value={currentTranslation?.footer || ''}
                    onChange={(e) => updateTranslation({ footer: e.target.value })}
                    maxLength={60}
                  />
                  <p className="text-xs text-gray-500">Maximum 60 characters</p>
                </div>
              </div>
            )}

            {/* Step 3: Buttons */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Buttons</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addButton}>
                    <Plus className="w-4 h-4 mr-1" /> Add Button
                  </Button>
                </div>

                {currentTranslation?.buttons.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">No buttons added yet</p>
                    <p className="text-xs text-gray-400">Add quick reply or call-to-action buttons</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentTranslation?.buttons.map((button, index) => (
                      <Card key={button.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move mt-4" />
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={button.type}
                                  onValueChange={(v) => updateButton(button.id, { type: v as ButtonCategory })}
                                >
                                  <SelectTrigger className="w-[140px]">
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
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                              
                              {button.type === 'call_to_action' && (
                                <div className="flex gap-3">
                                  <Select
                                    value={button.actionType || 'url'}
                                    onValueChange={(v) => updateButton(button.id, { actionType: v as any })}
                                  >
                                    <SelectTrigger className="w-[140px]">
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

                <p className="text-xs text-gray-500">
                  Maximum 3 quick reply buttons or 2 call-to-action buttons. 
                  Marketing templates should include at least one CTA button.
                </p>
              </div>
            )}

            {/* Step 4: Sample Data */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800">Sample Data Required</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Meta requires sample values for all variables to preview your template.
                  </p>
                </div>

                {variables.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No variables detected in your template body</p>
                    <p className="text-sm text-gray-400">Add {'{{1}}'}, {'{{2}}'}, etc. in the body text</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variables.map((variable) => (
                      <div key={variable.index} className="space-y-2">
                        <Label>Variable {'{{' + variable.index + '}}'}</Label>
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
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                )}
                {currentStep < WIZARD_STEPS.length ? (
                  <Button type="button" onClick={handleNext} disabled={isLoading}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSave} disabled={isLoading} className="bg-green-500 hover:bg-green-600">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Submit for Approval'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="w-[360px]  shrink-0">
        <div className="sticky top-4">
          <TemplatePreview preview={previewData} />
          
          {currentStep === 4 && variables.some(v => !v.sampleValue) && (
            <p className="text-xs text-red-500 text-center mt-2">
              Please provide sample values for all variables
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateWizard;
