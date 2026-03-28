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
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WhatsAppTemplate, TemplateCategory, TemplateStatus } from '@/types/template';
import { cn } from '@/lib/utils';

// Constants
const ITEMS_PER_PAGE_OPTIONS = [50, 100, 200];

// Types for sorting
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

const statusConfig = {
  approved: { 
    icon: CheckCircle, 
    color: 'text-green-600', 
    borderColor: 'border-green-200',
    bg: 'bg-green-50', 
    label: 'Approved' 
  },
  pending: { 
    icon: Clock, 
    color: 'text-yellow-600', 
    borderColor: 'border-yellow-200',
    bg: 'bg-yellow-50', 
    label: 'Pending' 
  },
  rejected: { 
    icon: XCircle, 
    color: 'text-red-600', 
    borderColor: 'border-red-200',
    bg: 'bg-red-50', 
    label: 'Rejected' 
  },
  draft: { 
    icon: AlertCircle, 
    color: 'text-gray-600', 
    borderColor: 'border-gray-200',
    bg: 'bg-gray-50', 
    label: 'Draft' 
  },
};

const categoryConfig: Record<TemplateCategory, { label: string; color: string; borderColor: string; bg: string; icon: typeof Megaphone }> = {
  marketing: { label: 'Marketing', color: 'text-lime-600', borderColor: 'border-lime-200', bg: 'bg-lime-50', icon: Megaphone },
  utility: { label: 'Utility', color: 'text-lime-600', borderColor: 'border-lime-200', bg: 'bg-lime-50', icon: Wrench },
  authentication: { label: 'Auth', color: 'text-lime-600', borderColor: 'border-lime-200', bg: 'bg-lime-50', icon: Lock },
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
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [activeStatus, setActiveStatus] = useState<TemplateStatus | 'all'>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Sorting states
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'updatedAt',
    order: 'desc',
  });

  // Handle sorting
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }));
    setCurrentPage(1);
  }, []);

  // Render sort indicator
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.order === 'asc' 
      ? <span className="ml-1">↑</span>
      : <span className="ml-1">↓</span>;
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = searchQuery === '' || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
      const matchesStatus = activeStatus === 'all' || template.status === activeStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [templates, searchQuery, activeCategory, activeStatus]);

  // Sort templates
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

  // Paginate templates
  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTemplates.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTemplates, currentPage, itemsPerPage]);

  // Calculate pagination meta
  const paginationMeta: PaginationMeta = useMemo(() => ({
    total: sortedTemplates.length,
    page: currentPage,
    limit: itemsPerPage,
    totalPages: Math.ceil(sortedTemplates.length / itemsPerPage),
  }), [sortedTemplates.length, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= paginationMeta.totalPages) {
      setCurrentPage(page);
    }
  }, [paginationMeta.totalPages]);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  }, []);

  // Reset filters
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

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Templates</h1>
            <p className="text-gray-500">Manage your WhatsApp message templates</p>
          </div>
          <div className="flex gap-2">
            {onOpenLibrary && (
              <Button onClick={onOpenLibrary} variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Browse Templates
              </Button>
            )}
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Create New Template
            </Button>
          </div>
        </div>

        <div className="border rounded-lg bg-white p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Templates</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Templates</h1>
            <p className="text-gray-500">Manage your WhatsApp message templates</p>
          </div>
          <div className="flex gap-2">
            {onOpenLibrary && (
              <Button onClick={onOpenLibrary} variant="outline" className="gap-2" disabled>
                <BookOpen className="w-4 h-4" />
                Browse Templates
              </Button>
            )}
            <Button onClick={onCreateNew} className="gap-2" disabled>
              <Plus className="w-4 h-4" />
              Create New Template
            </Button>
          </div>
        </div>

        <div className="border rounded-lg bg-white">
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
            <p className="text-gray-500">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Templates</h1>
          <p className="text-gray-500">
            Manage your WhatsApp message templates
          </p>
        </div>
        <div className="flex gap-2">
          {onSyncFromMeta && (
            <Button 
              onClick={onSyncFromMeta} 
              disabled={isSyncing}
              variant="default" 
              className="gap-2 bg-green-900 hover:bg-green-800"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              
            </Button>
          )}
          {onOpenLibrary && (
            <Button onClick={onOpenLibrary} variant="default" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Browse
            </Button>
          )}
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New 
          </Button>
        </div>
      </div>

      <div className="bg-green-950 rounded-t-3xl rounded-b-lg pt-4 pb-1 px-1 space-y-4">
        <div className="flex flex-row flex-wrap justify-between items-center px-2 gap-2 sm:gap-4">
          {/* Category Filter */}
          <Select
            value={activeCategory}
            onValueChange={(v) => {
              setActiveCategory(v as any);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px] sm:w-[130px] bg-green-900 border-green-700 text-white text-xs sm:text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All </SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="utility">Utility</SelectItem>
              <SelectItem value="authentication">Authentication</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={activeStatus}
            onValueChange={(v) => {
              setActiveStatus(v as any);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px] sm:w-[130px] bg-green-900 border-green-700 text-white text-xs sm:text-sm">
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

          {/* Clear Filters Button */}
          {(searchQuery ||
            activeCategory !== "all" ||
            activeStatus !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="border-green-700 text-gray-500 hover:bg-green-800 hover:text-white text-xs sm:text-sm px-2 sm:px-3"
            >
              Clear
            </Button>
          )}

          {/* Show entries */}
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-white">
            <span className="hidden sm:inline">Show</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-[60px] sm:w-[80px] bg-green-900 border-green-700 text-white text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden sm:inline">entries</span>
          </div>

          {/* Search */}
          <div className="relative w-[150px] sm:w-full lg:w-auto lg:min-w-[250px] flex-1 min-w-0">
            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-6 sm:pl-10 bg-white rounded-full border-green-700 text-black placeholder:text-gray-400 text-xs sm:text-sm h-8 sm:h-10"
            />
          </div>
        </div>

        {/* Templates Table */}
        <div className="border border-green-800 rounded-lg bg-green-900/50 overflow-hidden">
          <Table className="bg-white">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("name")}
                >
                  Name {renderSortIcon("name")}
                </TableHead>
                <TableHead>Language</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("category")}
                >
                  Category {renderSortIcon("category")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("status")}
                >
                  Status {renderSortIcon("status")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("updatedAt")}
                >
                  Updated On {renderSortIcon("updatedAt")}
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {paginatedTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-gray-500">No templates found</p>
                      {templates.length === 0 ? (
                        <Button variant="outline" onClick={onCreateNew}>
                          Create your first template
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={resetFilters}>
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
                  const languages = template.translations
                    .map((t) => t.language)
                    .join(", ");

                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-gray-500 truncate max-w-[250px]">
                            {template.translations[0]?.body?.substring(0, 40)}
                            ...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{languages}</span>
                      </TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "flex items-center gap-1.5",
                            category.bg,
                            category.borderColor,
                            "border px-2.5 py-1 rounded-full w-[100px] justify-start",
                          )}
                        >
                          {React.createElement(category.icon, {
                            className: cn("w-3.5 h-3.5 flex-shrink-0", category.color),
                          })}
                          <span className={cn("text-xs font-medium", category.color)}>
                            {category.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                "flex items-center gap-1.5",
                                status.bg,
                                status.borderColor,
                                "border px-2.5 py-1 rounded-full w-[100px] justify-start",
                              )}
                            >
                              <StatusIcon className={cn("w-3.5 h-3.5 flex-shrink-0", status.color)} />
                              <span className={cn("text-xs font-medium", status.color)}>
                                {status.label}
                              </span>
                            </div>
                            {template.status === 'rejected' && template.rejectionReason && (
                              <TooltipTrigger asChild>
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                            )}
                          </div>
                          {template.status === 'rejected' && template.rejectionReason && (
                            <TooltipContent side="top" className="max-w-[250px] bg-white border border-red-200 rounded-md p-3">
                              <div className="space-y-1">
                                <p className="font-semibold text-red-600">Rejection Reason:</p>
                                <p className="text-xs text-gray-500">{template.rejectionReason}</p>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(template.updatedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* Create Campaign Button */}
                          {template.status === "approved" &&
                            onCreateCampaign && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => onCreateCampaign(template)}
                                title="Create Campaign"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                            )}

                          {/* View Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => onViewDetails(template)}
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Edit Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => onEdit(template)}
                            title="Edit"
                            disabled={template.status === "approved"}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDelete(template)}
                            title="Delete"
                            disabled={template.status === "approved"}
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
      </div>

      {/* Pagination Controls */}
      {paginationMeta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {paginationMeta.page} of {paginationMeta.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
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
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                },
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === paginationMeta.totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(paginationMeta.totalPages)}
              disabled={currentPage === paginationMeta.totalPages}
            >
              Last
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateManagement;

