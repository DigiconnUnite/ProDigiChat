'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ArrowLeft, 
  ShoppingCart, 
  MessageSquare, 
  Bell, 
  CheckCircle, 
  Clock,
  Zap,
  Gift,
  Tag,
  FileText,
  Mail,
  Users,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplateCategory, CreateTemplateInput, TemplateTranslation, Button as TemplateButton } from '@/types/template';
import { toast } from 'sonner';
import { premadeTemplates, findTemplateByName, generateWhatsAppTemplateName } from '@/lib/premade-templates';

// Pre-made template interface - extends the library type with display name
interface PremadeTemplate {
  id: string;
  name: string;          // WhatsApp template name (lowercase with underscores)
  displayName: string;   // Human-readable display name
  description: string;
  category: TemplateCategory;
  popularity: number;
  translations: TemplateTranslation[];
  tags: string[];
  preview: {
    header?: string;
    body: string;
    footer?: string;
  };
}

// Pre-made templates data - using the library with WhatsApp-compliant names
// All templates are now imported from @/lib/premade-templates
const premadeTemplatesData: PremadeTemplate[] = premadeTemplates;

// Category icons
const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
  marketing: <ShoppingCart className="w-4 h-4" />,
  utility: <FileText className="w-4 h-4" />,
  authentication: <CheckCircle className="w-4 h-4" />
};

const categoryColors: Record<TemplateCategory, string> = {
  marketing: 'bg-lime-100 text-lime-800 border-lime-300',
  utility: 'bg-blue-100 text-blue-800 border-blue-300',
  authentication: 'bg-purple-100 text-purple-800 border-purple-300'
};

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'newest'>('popularity');
  const [selectedTemplate, setSelectedTemplate] = useState<PremadeTemplate | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Filter templates
  const filteredTemplates = premadeTemplates.filter((template) => {
    const matchesSearch = searchQuery === '' || 
      template.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort templates
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'popularity':
        return b.popularity - a.popularity;
      case 'name':
        return a.displayName.localeCompare(b.displayName);
      case 'newest':
        return 0; // All are pre-made, so same
      default:
        return 0;
    }
  });

  const handleUseTemplate = async (template: PremadeTemplate) => {
    try {
      // Generate a unique WhatsApp-compliant template name
      // Start with the template name from library, add user suffix for customization
      const baseName = template.name;
      let finalName = `${baseName}_user`;
      let counter = 1;
      
      // Create a copy of the template for the user with WhatsApp-compliant name
      const newTemplate: CreateTemplateInput = {
        name: finalName,
        category: template.category,
        translations: template.translations,
      };

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Template added to your library!');
        router.push(`/dashboard/templates/edit/${data.template.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add template');
    }
  };

  const handlePreview = (template: PremadeTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCopyTemplate = (template: PremadeTemplate) => {
    const templateText = `
Template: ${template.displayName}
WhatsApp Name: ${template.name}
Category: ${template.category}
---
${template.preview.body}
${template.preview.footer ? `\n${template.preview.footer}` : ''}
    `.trim();

    navigator.clipboard.writeText(templateText);
    setIsCopied(true);
    toast.success('Template copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="container mx-auto py-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold ">Template Library</h1>
            <p className="text-neutral-500">
              Browse pre-made templates for your campaigns
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-gray-600 placeholder:text-neutral-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Tabs
            value={activeCategory}
            onValueChange={(v) =>
              setActiveCategory(v as TemplateCategory | "all")
            }
          >
            <TabsList>
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-white data-[state=active]:text-black"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="marketing"
                className="data-[state=active]:bg-white data-[state=active]:text-black"
              >
                Marketing
              </TabsTrigger>
              <TabsTrigger
                value="utility"
                className="data-[state=active]:bg-white data-[state=active]:text-black"
              >
                Utility
              </TabsTrigger>
              <TabsTrigger
                value="authentication"
                className="data-[state=active]:bg-white data-[state=active]:text-black"
              >
                Auth
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select
            value={sortBy}
            onValueChange={(v: "popularity" | "name" | "newest") =>
              setSortBy(v)
            }
          >
            <SelectTrigger className="w-[140px] shadow-none border-none bg-gray-100 text-neutral-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-gray-100">
              <SelectItem
                value="popularity"
                className="text-neutral-800 focus:bg-white focus:text-black   "
              >
                Most Popular
              </SelectItem>
              <SelectItem
                value="name"
                className="text-neutral-800 focus:bg-white focus:text-black"
              >
                Name (A-Z)
              </SelectItem>
              <SelectItem
                value="newest"
                className="text-neutral-800 focus:bg-white focus:text-black"
              >
                Newest
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Template Count */}
      <div className="text-sm text-neutral-500 mb-4">
        Showing {sortedTemplates.length} of {premadeTemplates.length} templates
      </div>

      {/* Pre-made Templates Grid */}
      {sortedTemplates.length === 0 ? (
        <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-12 text-center">
          <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No templates found
          </h3>
          <p className="text-neutral-500 mb-4">
            Try adjusting your search or filters
          </p>
          <Button
            variant="outline"
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedTemplates.map((template) => (
            <Card
              key={template.id}
              className="bg-green-950 py-0 px-1 pt-1  cursor-pointer overflow-hidden group"
              onClick={() => handlePreview(template)}
            >
              {/* WhatsApp Chat Preview with Doodle Background */}
              <div className="relative h-48 pb-20 rounded-lg overflow-hidden">
                {/* WhatsApp Doodle Background */}
                <div
                  className="absolute inset-0 bg-cover bg-center   transition-opacity"
                  style={{
                    backgroundColor: "#ECE5DD",
                    backgroundImage: "url('/whatsapp-doodle-bg.png')",
                  }}
                />

                {/* WhatsApp-style Chat Bubble */}
                <div className="absolute top-5 left-2 right-2">
                  <div className="bg-white  rounded-lg p-3 shadow-lg">
                    {/* Header */}
                    {template.preview.header && (
                      <p className="font-medium  text-sm mb-1">
                        {template.preview.header}
                      </p>
                    )}
                    {/* Body */}
                    <p className="text-gray-600 text-xs line-clamp-3 leading-relaxed">
                      {template.preview.body}
                    </p>
                    {/* Footer */}
                    {template.preview.footer && (
                      <p className="text-white/60 text-[10px] mt-1">
                        {template.preview.footer}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <CardContent className="p-3  pt-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white text-sm truncate">
                    {template.displayName}
                  </h3>
                  <Badge
                    className={`${categoryColors[template.category]} text-[10px] py-0 h-5`}
                  >
                    <span className="capitalize">{template.category}</span>
                  </Badge>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] py-0 h-5 bg-white/10 text-neutral-100"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Actions */}
                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs  border-neutral-700 text-neutral-500 hover:bg-neutral-800 hover:text-white"
                    onClick={() => handleCopyTemplate(template)}
                  >
                    {isCopied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-primary hover:bg-emerald-700 text-white border-none"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
