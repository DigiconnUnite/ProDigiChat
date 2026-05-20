'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Send,
  FileText,
  Megaphone,
  Wrench,
  Lock,
  MessageCircle,
  Filter,
  X,
  Copy,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WhatsAppTemplate, TemplateCategory, TemplateStatus } from '@/types/template';
import { cn } from '@/lib/utils';

// Constants
const ITEMS_PER_PAGE_OPTIONS = [50, 100, 200];

type SortField = 'name' | 'category' | 'status' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

interface TemplateLibraryProps {
  templates: WhatsAppTemplate[];
  onCreateNew: () => void;
  onOpenLibrary?: () => void;
  onSyncFromMeta?: () => void;
  onEdit: (template: WhatsAppTemplate) => void;
  onDuplicate?: (template: WhatsAppTemplate) => void;
  onDelete: (template: WhatsAppTemplate) => void;
  onViewDetails: (template: WhatsAppTemplate) => void;
  onCreateCampaign?: (template: WhatsAppTemplate) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isSyncing?: boolean;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

const statusConfig: Record<string, { icon: any; label: string; badgeClass: string }> = {
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
  },
  draft: {
    icon: AlertCircle,
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

const categoryConfig: Record<string, { label: string; badgeClass: string; icon: any }> = {
  marketing: { label: 'Marketing', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200', icon: Megaphone },
  utility: { label: 'Utility', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', icon: Wrench },
  authentication: { label: 'Auth', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200', icon: Lock },
};

export function TemplateManagement({
  templates,
  onCreateNew,
  onOpenLibrary,
  onSyncFromMeta,
  onEdit,
  onDuplicate,
  onDelete,
  onViewDetails,
  onCreateCampaign,
  isLoading = false,
  error = null,
  onRetry,
  isSyncing = false,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [activeStatus, setActiveStatus] = useState<TemplateStatus | 'all'>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'updatedAt',
    order: 'desc',
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null);

  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }));
    setCurrentPage(1);
  }, []);

  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <span className="ml-1 text-slate-300">↕</span>;
    return sortConfig.order === 'asc'
      ? <span className="ml-1 text-green-400">↑</span>
      : <span className="ml-1 text-green-400">↓</span>;
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
      const matchesStatus = activeStatus === 'all' || template.status === activeStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [templates, searchQuery, activeCategory, activeStatus]);

  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortConfig.order === 'asc' ? comparison : -comparison;
    });
  }, [filteredTemplates, sortConfig]);

  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTemplates.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTemplates, currentPage, itemsPerPage]);

  const paginationMeta: PaginationMeta = useMemo(() => ({
    total: sortedTemplates.length,
    page: currentPage,
    limit: itemsPerPage,
    totalPages: Math.ceil(sortedTemplates.length / itemsPerPage),
  }), [sortedTemplates.length, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= paginationMeta.totalPages) {
      setCurrentPage(page);
    }
  }, [paginationMeta.totalPages]);

  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('all');
    setActiveStatus('all');
    setCurrentPage(1);
    setSortConfig({ field: 'updatedAt', order: 'desc' });
  }, []);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const hasActiveFilters = searchQuery || activeCategory !== 'all' || activeStatus !== 'all';

  const handleDeleteTemplate = (template: WhatsAppTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      onDelete(templateToDelete);
    }
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };


  // ═══════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════

  if (error) {
    return (
      <div className="bg-transparent px-2.5 lg:px-0">
        <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-foreground text-2xl font-bold mb-1">Manage Templates</h1>
              <p className="text-muted-foreground text-lg">Manage your WhatsApp message templates</p>
            </div>
            <div className="flex items-center gap-2">
              {onSyncFromMeta && (
                <Button variant="outline" size="icon" className="rounded-lg border-slate-300" onClick={onSyncFromMeta} disabled={isSyncing}>
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {onOpenLibrary && (
                <Button variant="outline" className="rounded-lg border-slate-300 text-sm" onClick={onOpenLibrary}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Templates
                </Button>
              )}
              <Button className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm" onClick={onCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Template
              </Button>
            </div>
          </div>

          <div className="p-5 rounded-xl border-2 border-red-400 bg-red-50 text-center py-16">
            <div className="h-14 w-14 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Templates</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">{error}</p>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="rounded-lg border-slate-300 text-sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <div className="bg-transparent px-2.5 lg:px-0">
        <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-foreground text-2xl font-bold mb-1">Manage Templates</h1>
              <p className="text-muted-foreground text-lg">Manage your WhatsApp message templates</p>
            </div>
            <div className="flex items-center gap-2">
              <Button disabled className="rounded-lg border-slate-300 text-sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button disabled className="rounded-lg border-slate-300 text-sm">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Templates
              </Button>
              <Button disabled className="rounded-lg bg-green-600 text-white text-sm">
                <Plus className="w-4 h-4 mr-2" />
                Create New Template
              </Button>
            </div>
          </div>

          <div className="p-5 rounded-xl border-2 border-green-950 bg-white">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="bg-transparent px-2.5 lg:px-0">
      <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10 pb-20 min-h-[87vh]">

        {/* ═══ Page Header ═══ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-foreground text-2xl font-bold mb-1">Manage Templates</h1>
            <p className="text-muted-foreground text-lg">Manage your WhatsApp message templates</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onSyncFromMeta && (
              <Button
                variant="outline"
                className="rounded-lg border-slate-300 text-sm"
                onClick={onSyncFromMeta}
                disabled={isSyncing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
                Sync
              </Button>
            )}
            {onOpenLibrary && (
              <Button variant="outline" className="rounded-lg border-slate-300 text-sm" onClick={onOpenLibrary}>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Templates
              </Button>
            )}
            <Button className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm" onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Template
            </Button>
          </div>
        </div>


        {/* ═══ Table Card ═══ */}
        <div className="rounded-xl">

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="pl-10 text-sm rounded-lg border-slate-300 h-10 bg-white"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={activeCategory}
              onValueChange={(v) => { setActiveCategory(v as any); setCurrentPage(1) }}
            >
              <SelectTrigger className="w-[150px] text-sm rounded-lg border-slate-300 h-10 bg-white">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={activeStatus}
              onValueChange={(v) => { setActiveStatus(v as any); setCurrentPage(1) }}
            >
              <SelectTrigger className="w-[150px] text-sm rounded-lg border-slate-300 h-10 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            {/* Items per page */}
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[120px] text-sm rounded-lg border-slate-300 h-10 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-lg border-slate-300 text-sm h-10">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border-2 border-t-0 border-green-950 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-green-950">
                <TableRow className="bg-green-950 hover:bg-green-950">
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort('name')}
                  >
                    Template Name {renderSortIcon('name')}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted py-3 px-4 hidden md:table-cell">
                    Language
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort('category')}
                  >
                    Category {renderSortIcon('category')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort('status')}
                  >
                    Status {renderSortIcon('status')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hidden lg:table-cell hover:bg-green-950"
                    onClick={() => handleSort('updatedAt')}
                  >
                    Updated {renderSortIcon('updatedAt')}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {paginatedTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
                          <FileText className="h-7 w-7 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {templates.length === 0
                            ? 'No templates found'
                            : 'No templates match your filters'}
                        </p>
                        {templates.length === 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              Create your first template or browse the template library
                            </p>
                            <div className="flex items-center gap-2">
                              {onOpenLibrary && (
                                <Button variant="outline" className="rounded-lg border-slate-300 text-sm" onClick={onOpenLibrary}>
                                  <BookOpen className="w-4 h-4 mr-2" />
                                  Browse Templates
                                </Button>
                              )}
                              <Button className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm" onClick={onCreateNew}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Template
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="ghost" className="rounded-lg text-sm" onClick={resetFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTemplates.map((template) => {
                    const status = statusConfig[template.status] || statusConfig.draft;
                    const StatusIcon = status.icon;
                    const category = categoryConfig[template.category] || categoryConfig.marketing;
                    const CategoryIcon = category.icon;
                    const languages = template.translations
                      .map((t) => t.language)
                      .join(', ');
                    const languageCount = template.translations.length;

                    return (
                      <TableRow key={template.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* Template Name */}
                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <MessageCircle className="h-5 w-5 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => onViewDetails(template)}
                                className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block text-left"
                              >
                                {template.name}
                              </button>
                              {languageCount > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Globe className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {languageCount} language{languageCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Language */}
                        <TableCell className="py-3.5 px-4 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground truncate block max-w-[150px]" title={languages}>
                            {languages || '—'}
                          </span>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="py-3.5 px-4">
                          <Badge className={cn('text-xs border flex items-center gap-1.5 w-fit', category.badgeClass)}>
                            <CategoryIcon className="w-3 h-3" />
                            {category.label}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5 px-4">
                          <Tooltip>
                            <div className="flex items-center gap-1.5">
                              <Badge className={cn('text-xs border flex items-center gap-1.5 w-fit', status.badgeClass)}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                              {template.status === 'rejected' && template.rejectionReason && (
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 cursor-help flex-shrink-0" />
                                </TooltipTrigger>
                              )}
                            </div>
                            {template.status === 'rejected' && template.rejectionReason && (
                              <TooltipContent side="top" className="max-w-[280px] rounded-lg border-2 border-red-200 bg-white p-3">
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-red-700">Rejection Reason:</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{template.rejectionReason}</p>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>

                        {/* Updated */}
                        <TableCell className="py-3.5 px-4 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(template.updatedAt)}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {/* Create Campaign */}
                            {template.status === 'approved' && onCreateCampaign && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => onCreateCampaign(template)}
                                title="Create Campaign"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* View */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="View Details"
                              onClick={() => onViewDetails(template)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {/* Duplicate */}
                            {onDuplicate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                title="Duplicate"
                                onClick={() => onDuplicate(template)}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit"
                              onClick={() => onEdit(template)}
                              disabled={template.status === 'approved'}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                              onClick={() => handleDeleteTemplate(template)}
                              disabled={template.status === 'approved'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {paginationMeta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 px-1">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, paginationMeta.total)} of {paginationMeta.total}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-slate-300 h-8 w-8 p-0"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from(
                  { length: Math.min(5, paginationMeta.totalPages) },
                  (_, i) => {
                    let pageNum: number;
                    if (paginationMeta.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= paginationMeta.totalPages - 2) {
                      pageNum = paginationMeta.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'rounded-lg h-8 w-8 p-0 text-xs',
                          currentPage === pageNum
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : 'border-slate-300'
                        )}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-slate-300 h-8 w-8 p-0"
                  onClick={() => handlePageChange(paginationMeta.totalPages)}
                  disabled={currentPage === paginationMeta.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Delete Dialog ═══ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-xl border-2 border-destructive">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Template
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{templateToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              All data associated with this template will be permanently removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete} className="rounded-lg border-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="rounded-lg bg-red-600 hover:bg-red-700 text-white border-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TemplateManagement;