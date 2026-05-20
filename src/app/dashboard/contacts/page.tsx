"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  Search,
  Plus,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  Send,
  UserPlus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Users,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Tag,
  MessageSquare,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog"
import { ImportContactsDialog } from "@/components/contacts/import-contacts-dialog"
import { ContactDetailDrawer } from "@/components/contacts/contact-detail-drawer"
import { BulkTagDialog } from "@/components/contacts/bulk-tag-dialog"
import { cn } from "@/lib/utils"
import { parseTags } from "@/types/common"

// Constants
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

// Types
interface Contact {
  id: string
  firstName: string
  lastName?: string | null
  displayName?: string | null
  phoneNumber: string
  email?: string | null
  lifecycleStatus?: string | null
  optInStatus: string
  tags?: string | null
  attributes: string
  createdAt: string
  updatedAt: string
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

type SortField = 'firstName' | 'phoneNumber' | 'optInStatus' | 'createdAt'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  order: SortOrder
}

const statusConfig: Record<string, { icon: any; label: string; badgeClass: string }> = {
  opted_in: {
    icon: CheckCircle2,
    label: "Opted In",
    badgeClass: "bg-green-100 text-green-800 border-green-200"
  },
  opted_out: {
    icon: XCircle,
    label: "Opted Out",
    badgeClass: "bg-red-100 text-red-800 border-red-200"
  },
  pending: {
    icon: Clock,
    label: "Pending",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200"
  },
}

const lifecycleConfig: Record<string, { label: string; badgeClass: string }> = {
  lead: { label: 'Lead', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  active: { label: 'Active', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
  suppressed: { label: 'Suppressed', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  blocked: { label: 'Blocked', badgeClass: 'bg-rose-100 text-rose-700 border-rose-200' },
  bounced: { label: 'Bounced', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const AVATAR_COLORS = [
  'bg-green-100 text-green-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

const getAvatarColor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const getInitials = (firstName: string, lastName?: string | null) => {
  return (firstName[0] + (lastName && lastName[0] ? lastName[0] : '')).toUpperCase()
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'createdAt',
    order: 'desc',
  })


  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)

  const [drawerContact, setDrawerContact] = useState<Contact | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', currentPage.toString())
      params.set('limit', itemsPerPage.toString())
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (lifecycleFilter !== 'all') params.set('lifecycleStatus', lifecycleFilter)
      params.set('sortBy', sortConfig.field)
      params.set('sortOrder', sortConfig.order)

      const response = await fetch(`/api/contacts?${params}`)
      const result = await response.json()

      if (result.success) {
        setContacts(result.data)
        setTotalCount(result.total ?? 0)
      } else {
        setError(result.error || "Failed to fetch contacts")
        toast.error(result.error || "Failed to fetch contacts")
      }
    } catch (error) {
      setError("Something went wrong")
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, lifecycleFilter, sortConfig])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchContacts()
    }, 300)
    return () => clearTimeout(debounce)
  }, [fetchContacts])

  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }))
    setCurrentPage(1)
  }, [])

  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <span className="ml-1 text-slate-300">↕</span>
    return sortConfig.order === 'asc'
      ? <span className="ml-1 text-green-400">↑</span>
      : <span className="ml-1 text-green-400">↓</span>
  }

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= Math.ceil(totalCount / itemsPerPage)) {
      setCurrentPage(page)
    }
  }, [totalCount, itemsPerPage])

  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('all')
    setLifecycleFilter('all')
    setTagFilter('all')
    setSegmentFilter('all')
    setCurrentPage(1)
    setSortConfig({ field: 'createdAt', order: 'desc' })
  }, [])

  // Bulk selection
  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts)
    if (checked) {
      newSelected.add(contactId)
    } else {
      newSelected.delete(contactId)
    }
    setSelectedContacts(newSelected)
    setSelectAll(newSelected.size === contacts.length && contacts.length > 0)
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedContacts(new Set(contacts.map((c) => c.id)))
    } else {
      setSelectedContacts(new Set())
    }
  }

  const handleClearSelection = () => {
    setSelectedContacts(new Set())
    setSelectAll(false)
  }

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return
    if (!confirm(`Delete ${selectedContacts.size} contacts? This cannot be undone.`)) return

    try {
      const results = await Promise.all(
        Array.from(selectedContacts).map((id) =>
          fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
        )
      )
      const failed = results.filter((r) => !r.ok).length
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} contact(s)`)
      } else {
        toast.success(`Deleted ${selectedContacts.size} contacts`)
      }
      handleClearSelection()
      fetchContacts()
    } catch (error) {
      toast.error('Failed to delete contacts')
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedContacts.size === 0) return
    try {
      const promises = Array.from(selectedContacts).map((id) =>
        fetch('/api/contacts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, optInStatus: newStatus }),
        })
      )
      await Promise.all(promises)
      toast.success(`Updated ${selectedContacts.size} contacts`)
      handleClearSelection()
      fetchContacts()
    } catch (error) {
      toast.error('Failed to update contacts')
    }
  }

  const handleBulkTag = async (tags: string[], action: "add" | "remove" | "replace") => {
    if (selectedContacts.size === 0) return
    try {
      const promises = Array.from(selectedContacts).map(async (id) => {
        const contact = contacts.find((c) => c.id === id)
        if (!contact) return
        const existingTags = parseTags(contact.tags ?? null)
        let newTags: string[]
        if (action === "add") {
          newTags = [...new Set([...existingTags, ...tags])]
        } else if (action === "remove") {
          newTags = existingTags.filter((t) => !tags.includes(t))
        } else {
          newTags = tags
        }
        return fetch('/api/contacts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, tags: JSON.stringify(newTags) }),
        })
      })
      await Promise.all(promises)
      toast.success(`Updated tags for ${selectedContacts.size} contacts`)
      handleClearSelection()
      fetchContacts()
    } catch (error) {
      toast.error('Failed to update tags')
    }
  }

  const filteredContacts = useMemo(() => {
    let filtered = [...contacts]
    if (searchQuery) {
      filtered = filtered.filter(
        (contact) =>
          contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          contact.phoneNumber.includes(searchQuery) ||
          (contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    }
    if (segmentFilter !== 'all') {
      filtered = filtered.filter((contact) => contact.optInStatus === segmentFilter)
    }
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field]
      const bValue = b[sortConfig.field]
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      return sortConfig.order === 'desc' ? -comparison : comparison
    })
    return filtered
  }, [contacts, searchQuery, segmentFilter, sortConfig])

  // Pagination is server-side — API returns only the current page's contacts
  const paginatedContacts = filteredContacts

  const paginationMeta: PaginationMeta = useMemo(() => ({
    total: totalCount,
    page: currentPage,
    limit: itemsPerPage,
    totalPages: Math.ceil(totalCount / itemsPerPage),
  }), [totalCount, currentPage, itemsPerPage])

  const handleDeleteContact = async () => {
    if (!contactToDelete) return
    try {
      const response = await fetch(`/api/contacts?id=${contactToDelete.id}`, { method: "DELETE" })
      const result = await response.json()
      if (result.success) {
        toast.success("Contact deleted successfully")
        fetchContacts()
      } else {
        toast.error(result.error || "Failed to delete contact")
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setDeleteDialogOpen(false)
      setContactToDelete(null)
    }
  }

  const handleOpenDrawer = (contact: Contact) => {
    setDrawerContact(contact)
    setDrawerOpen(true)
  }

  const handleSendMessage = (contact: Contact) => {
    toast.info(`Send message to ${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'contact')
  }

  const handleEditFromDrawer = (contact: Contact) => {
    setDrawerOpen(false)
  }

  const handleDeleteFromDrawer = (contact: Contact) => {
    setDrawerOpen(false)
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
  }

  const handleDelete = (contact: Contact) => {
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (lifecycleFilter !== 'all') params.set('lifecycleStatus', lifecycleFilter)
      params.set('sortBy', sortConfig.field)
      params.set('sortOrder', sortConfig.order)

      const response = await fetch(`/api/contacts/export?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to export contacts')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Contacts exported successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to export contacts')
    } finally {
      setIsExporting(false)
    }
  }

  const hasActiveFilters = searchQuery || segmentFilter !== 'all' || lifecycleFilter !== 'all' || tagFilter !== 'all'

  // ═══════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════

  if (error) {
    return (
      <div className="bg-transparent px-2.5 lg:px-0">
        <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-foreground text-2xl font-bold mb-1">Contacts</h1>
              <p className="text-muted-foreground text-lg">Manage your WhatsApp contacts</p>
            </div>
            <ContactFormDialog
              contact={null}
              onSuccess={() => { setCurrentPage(1); fetchContacts() }}
            >
              <Button className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </ContactFormDialog>
          </div>

          <div className="p-5 rounded-xl border-2 border-red-400 bg-red-50 text-center py-16">
            <div className="h-14 w-14 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Contacts</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={fetchContacts} variant="outline" className="rounded-lg border-slate-300 text-sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (isLoading && contacts.length === 0) {
    return (
      <div className="bg-transparent px-2.5 lg:px-0">
        <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-foreground text-2xl font-bold mb-1">Contacts</h1>
              <p className="text-muted-foreground text-lg">Manage your WhatsApp contacts</p>
            </div>
            <Button disabled className="rounded-lg bg-green-600 text-white text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>

          <div className="p-5 rounded-xl border-2 border-green-950 bg-white">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    )
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
            <h1 className="text-foreground text-2xl font-bold mb-1">Contacts</h1>
            <p className="text-muted-foreground text-lg">Manage your WhatsApp contacts</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ImportContactsDialog onImportComplete={() => fetchContacts()}>
              <Button variant="outline" className="rounded-lg border-slate-300 text-sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </ImportContactsDialog>
            <Button
              variant="outline"
              className="rounded-lg border-slate-300 text-sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export
            </Button>
            <ContactFormDialog
              contact={null}
              onSuccess={() => { setCurrentPage(1); fetchContacts() }}
            >
              <Button className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </ContactFormDialog>
          </div>
        </div>


        {/* ═══ Table Card ═══ */}
        <div className="rounded-xl">

          {/* Bulk Action Bar */}
          {selectedContacts.size > 0 && (
            <div className="rounded-t-xl border-2 border-b-0 border-green-950 bg-green-950 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-100 font-medium">
                  {selectedContacts.size} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-green-300 hover:text-white hover:bg-green-800 rounded-lg"
                  onClick={handleClearSelection}
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <BulkTagDialog
                  selectedCount={selectedContacts.size}
                  onApply={(tags, action) => handleBulkTag(tags, action)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-green-300 hover:text-white hover:bg-green-800 rounded-lg"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    Tag
                  </Button>
                </BulkTagDialog>
                <Select onValueChange={handleBulkStatusChange}>
                  <SelectTrigger className="h-7 w-[130px] text-xs bg-green-900 border-green-700 text-green-200 rounded-lg">
                    <SelectValue placeholder="Set Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opted_in">Opt In</SelectItem>
                    <SelectItem value="opted_out">Opt Out</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-lg"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="pl-10 text-sm rounded-lg border-slate-300 h-10 bg-white"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={segmentFilter}
              onValueChange={(v) => { setSegmentFilter(v); setCurrentPage(1) }}
            >
              <SelectTrigger className="w-[150px] text-sm rounded-lg border-slate-300 h-10 bg-white">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="opted_in">Opted In</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="opted_out">Opted Out</SelectItem>
              </SelectContent>
            </Select>

            {/* Lifecycle Filter */}
            {lifecycleFilter && (
              <Select
                value={lifecycleFilter}
                onValueChange={(v) => { setLifecycleFilter(v); setCurrentPage(1) }}
              >
                <SelectTrigger className="w-[150px] text-sm rounded-lg border-slate-300 h-10 bg-white">
                  <SelectValue placeholder="Lifecycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lifecycle</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suppressed">Suppressed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Items per page */}
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
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
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="rounded-lg border-slate-300 text-sm h-10"
              >
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
                  <TableHead className="py-3 px-4 w-10">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-green-400 data-[state=checked]:border-green-400 data-[state=checked]:text-green-950"
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort("firstName")}
                  >
                    Name {renderSortIcon("firstName")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort("phoneNumber")}
                  >
                    Phone {renderSortIcon("phoneNumber")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted py-3 px-4 hidden md:table-cell">
                    Email
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort("optInStatus")}
                  >
                    Status {renderSortIcon("optInStatus")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hidden lg:table-cell hover:bg-green-950"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created {renderSortIcon("createdAt")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {paginatedContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
                          <Users className="h-7 w-7 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {contacts.length === 0
                            ? "No contacts found"
                            : "No contacts match your filters"}
                        </p>
                        {contacts.length === 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              Try importing contacts or create your first contact
                            </p>
                            <ContactFormDialog
                              contact={null}
                              onSuccess={() => { setCurrentPage(1); fetchContacts() }}
                            >
                              <Button variant="outline" className="rounded-lg border-slate-300 text-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Create your first contact
                              </Button>
                            </ContactFormDialog>
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
                  paginatedContacts.map((contact) => {
                    const initials = getInitials(contact.firstName, contact.lastName)
                    const avatarColor = getAvatarColor(contact.firstName)
                    const statusInfo = statusConfig[contact.optInStatus]
                    const StatusIcon = statusInfo?.icon || Clock
                    const tags = parseTags(contact.tags ?? null)

                    return (
                      <TableRow
                        key={contact.id}
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors group",
                          selectedContacts.has(contact.id) && "bg-green-50/50"
                        )}
                      >
                        <TableCell className="py-3.5 px-4">
                          <Checkbox
                            checked={selectedContacts.has(contact.id)}
                            onCheckedChange={(checked) => handleSelectContact(contact.id, !!checked)}
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white"
                          />
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <button
                            onClick={() => handleOpenDrawer(contact)}
                            className="flex items-center gap-3 text-left"
                          >
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 font-semibold text-xs", avatarColor)}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">
                                {contact.firstName} {contact.lastName || ''}
                              </p>
                              {tags.length > 0 && (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} className="bg-slate-100 text-slate-600 border-slate-200 text-xs font-mono h-5">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {tags.length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <span className="text-sm font-mono text-foreground">{contact.phoneNumber}</span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">{contact.email || '—'}</span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          {statusInfo && (
                            <Badge className={cn("text-xs border flex items-center gap-1.5 w-fit", statusInfo.badgeClass)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusInfo.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {new Date(contact.createdAt || '').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="View Details"
                              onClick={() => handleOpenDrawer(contact)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit"
                              onClick={() => handleEdit(contact)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                              onClick={() => handleDelete(contact)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
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
                    let pageNum: number
                    if (paginationMeta.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= paginationMeta.totalPages - 2) {
                      pageNum = paginationMeta.totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "rounded-lg h-8 w-8 p-0 text-xs",
                          currentPage === pageNum
                            ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                            : "border-slate-300"
                        )}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
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
              Delete Contact
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{contactToDelete?.firstName} {contactToDelete?.lastName}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              All data associated with this contact will be permanently removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-lg border-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteContact}
              className="rounded-lg bg-red-600 hover:bg-red-700 text-white border-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Contact Detail Drawer ═══ */}
      <ContactDetailDrawer
        contact={drawerContact}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={handleEditFromDrawer}
        onDelete={handleDeleteFromDrawer}
        onSendMessage={handleSendMessage}
      />

      {/* ═══ Edit Contact Dialog ═══ */}
      {editingContact && (
        <ContactFormDialog
          contact={editingContact}
          onSuccess={() => {
            setEditingContact(null)
            fetchContacts()
          }}
        >
          <div style={{ display: 'none' }} />
        </ContactFormDialog>
      )}
    </div>
  )
}