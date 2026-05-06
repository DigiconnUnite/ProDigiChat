"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Copy,
  Check,
  MessageSquare,
  CheckCircle,
  Zap,
  FileText,
  AlertCircle,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandardLayout } from "@/components/ui/standard-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TemplateCategory,
  CreateTemplateInput,
  TemplateTranslation,
  HeaderContent,
} from "@/types/template";
import { toast } from "sonner";
import { premadeTemplates } from "@/lib/premade-templates";
import { TemplatePreview } from "@/components/templates/template-preview";

// ═══════════════════════════════════════════════════════════════
// REUSABLE STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StyledCard({
  children,
  className = "",
  title,
  description,
  titleIcon: TitleIcon,
  headerRight,
  accent = false,
  danger = false,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  titleIcon?: any;
  headerRight?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  const borderClass = danger
    ? "border-2 border-red-400"
    : accent
      ? "border-l-4 border-l-green-500 border-2 border-green-200 bg-green-50/50"
      : "border-2 border-green-950";

  return (
    <div
      className={`p-5 rounded-xl bg-white transition-all ${borderClass} ${className}`}
    >
      {(title || headerRight) && (
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                {TitleIcon && <TitleIcon className="h-5 w-5" />}
                {title}
              </h3>
            )}
            {description && (
              <p className="text-muted-foreground text-sm mt-1">
                {description}
              </p>
            )}
          </div>
          {headerRight && (
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {headerRight}
            </div>
          )}
        </div>
      )}
      <div className="space-y-0">{children}</div>
    </div>
  );
}

// Pre-made template interface
interface PremadeTemplate {
  id: string;
  name: string;
  displayName: string;
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

const premadeTemplatesData: PremadeTemplate[] = premadeTemplates;

const toHeaderContent = (header?: string): HeaderContent | undefined =>
  header ? { type: "text", text: header } : undefined;

const categoryColors: Record<TemplateCategory, string> = {
  marketing: "bg-green-100 text-green-800 border-green-200",
  utility: "bg-blue-100 text-blue-800 border-blue-200",
  authentication: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    TemplateCategory | "all"
  >("all");
  const [sortBy, setSortBy] = useState<"popularity" | "name" | "newest">(
    "popularity",
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<PremadeTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter templates
  const filteredTemplates = premadeTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    const matchesCategory =
      activeCategory === "all" || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort templates
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case "popularity":
        return b.popularity - a.popularity;
      case "name":
        return a.displayName.localeCompare(b.displayName);
      case "newest":
        return 0;
      default:
        return 0;
    }
  });

  const handleUseTemplate = async (template: PremadeTemplate) => {
    try {
      const baseName = template.name;
      let finalName = `${baseName}_user`;

      const newTemplate: CreateTemplateInput = {
        name: finalName,
        category: template.category,
        translations: template.translations,
      };

      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Template added to your library!");
        router.push(`/dashboard/templates/edit/${data.template.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create template");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add template");
    }
  };

  const handleCopyTemplate = (template: PremadeTemplate) => {
    const templateText = `
Template: ${template.displayName}
WhatsApp Name: ${template.name}
Category: ${template.category}
---
 ${template.preview.body}
 ${template.preview.footer ? `\n${template.preview.footer}` : ""}
    `.trim();

    navigator.clipboard.writeText(templateText);
    setCopiedId(template.id);
    toast.success("Template copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <StandardLayout className="min-h-[87vh]">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Template Library</h1>
          <p className="text-muted-foreground text-lg mt-1">
            Browse pre-made templates for your WhatsApp campaigns
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, tag, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10 rounded-lg border-slate-300 text-sm bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Tabs
              value={activeCategory}
              onValueChange={(v) =>
                setActiveCategory(v as TemplateCategory | "all")
              }
            >
              <TabsList className="h-10 p-1 bg-muted border rounded-lg">
                <TabsTrigger
                  value="all"
                  className="h-8 text-sm px-3 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="marketing"
                  className="h-8 text-sm px-3 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Marketing
                </TabsTrigger>
                <TabsTrigger
                  value="utility"
                  className="h-8 text-sm px-3 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Utility
                </TabsTrigger>
                <TabsTrigger
                  value="authentication"
                  className="h-8 text-sm px-3 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
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
              <SelectTrigger className="h-10 w-full sm:w-[160px] rounded-lg border-slate-300 text-sm bg-white">
                <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Most Popular</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground font-medium">
          Showing {sortedTemplates.length} of {premadeTemplates.length}{" "}
          templates
        </div>

      {/* Template Grid */}
      {sortedTemplates.length === 0 ? (
        <div className="p-12 rounded-xl border-2 border-dashed border-slate-300 bg-white text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No templates found
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            We couldn&apos;t find any templates matching your search. Try
            adjusting your filters.
          </p>
          <Button
            variant="outline"
            className="rounded-lg border-slate-300 text-sm"
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border-2 border-green-950 bg-white overflow-hidden hover:shadow-lg transition-all group cursor-pointer flex flex-col"
              onClick={() => setSelectedTemplate(template)}
            >
              {/* WhatsApp Chat Preview */}
              <div
                className="relative h-48 overflow-hidden bg-[#ECE5DD]"
                style={{
                  backgroundImage: "url('/whatsapp-doodle-bg.png')",
                  backgroundSize: "cover",
                }}
              >
                <div className="absolute top-4 left-3 right-3">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                    {template.preview.header && (
                      <p className="font-semibold text-sm text-foreground mb-1">
                        {template.preview.header}
                      </p>
                    )}
                    <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                      {template.preview.body}
                    </p>
                    {template.preview.footer && (
                      <p className="text-slate-400 text-[10px] mt-1.5 border-t border-slate-100 pt-1">
                        {template.preview.footer}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {template.displayName}
                  </h3>
                  <Badge
                    className={`${categoryColors[template.category]} text-[10px] px-1.5 py-0 h-5 flex-shrink-0`}
                  >
                    {template.category}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] h-5 bg-slate-50 text-slate-600 border border-slate-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div
                  className="mt-auto flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs rounded-lg border-slate-300 hover:bg-slate-50"
                    onClick={() => handleCopyTemplate(template)}
                  >
                    {copiedId === template.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-green-600" />{" "}
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Template Preview Dialog */}
        {selectedTemplate && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTemplate(null)}
          >
            <div
              className="bg-white rounded-2xl border-2 border-green-950 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {selectedTemplate.displayName}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={`${categoryColors[selectedTemplate.category]} text-xs`}
                      >
                        {selectedTemplate.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {selectedTemplate.name}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500 hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6">
                  <TemplatePreview
                    preview={{
                      body: selectedTemplate.preview.body,
                      header: toHeaderContent(selectedTemplate.preview.header),
                      footer: selectedTemplate.preview.footer,
                      buttons: [],
                      variables: [],
                    }}
                  />
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.description}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-slate-50 text-slate-600 border border-slate-200"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-slate-200 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-lg border-slate-300 text-sm"
                    onClick={() => {
                      handleCopyTemplate(selectedTemplate);
                      setSelectedTemplate(null);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Text
                  </Button>
                  <Button
                    className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                    onClick={() => {
                      handleUseTemplate(selectedTemplate);
                      setSelectedTemplate(null);
                    }}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardLayout>
  );
}
