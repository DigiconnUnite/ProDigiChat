// Template Types for WhatsApp Marketing Tool

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
  actionValue?: string; // URL or phone number
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
  metaTemplateId?: string; // ID from Meta API
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

export interface WizardStep {
  id: number;
  title: string;
  description: string;
}
