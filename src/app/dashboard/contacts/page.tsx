"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
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
  Check,
  Menu,
  Filter,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const statusConfig = {
  opted_in: { 
    icon: CheckCircle2, 
    label: "Opted In", 
    color: "text-green-600", 
    borderColor: "border-green-200",
    bg: "bg-green-50" 
  },
  opted_out: { 
    icon: XCircle, 
    label: "Opted Out", 
    color: "text-red-600", 
    borderColor: "border-red-200",
    bg: "bg-red-50" 
  },
  pending: { 
    icon: Clock, 
    label: "Pending", 
    color: "text-yellow-600", 
    borderColor: "border-yellow-200",
    bg: "bg-yellow-50" 
  },
}

const lifecycleConfig = {
  lead: { label: 'Lead', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  active: { label: 'Active', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  suppressed: { label: 'Suppressed', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  blocked: { label: 'Blocked', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  bounced: { label: 'Bounced', className: 'bg-orange-100 text-orange-700 border-orange-200' },
}

// Avatar color palette
const AVATAR_COLORS = ['#25D366', '#128C7E', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

// Helper functions for avatars
const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length]

const getInitials = (firstName: string, lastName?: string | null) => {
  return (firstName[0] + (lastName ? lastName[0] : '')).toUpperCase()
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Sorting states
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'createdAt',
    order: 'desc',
  })
  
  // Stats
  const [stats, setStats] = useState({ total: 0, optedIn: 0, pending: 0, optedOut: 0 })
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)

  // Contact detail drawer
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Bulk selection
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
        setStats({
          total: result.total || 0,
          optedIn: result.optedIn || 0,
          pending: result.pending || 0,
          optedOut: result.optedOut || 0,
        })
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

  // Handle sorting
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }))
    setCurrentPage(1)
  }, [])

  // Render sort indicator
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return null
    return sortConfig.order === 'asc' 
      ? <span className="ml-1">↑</span>
      : <span className="ml-1">↓</span>
  }

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= Math.ceil(stats.total / itemsPerPage)) {
      setCurrentPage(page)
    }
  }, [stats.total, itemsPerPage])

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('all')
    setLifecycleFilter('all')
    setTagFilter('all')
    setSegmentFilter('all')
    setCurrentPage(1)
    setSortConfig({ field: 'createdAt', order: 'desc' })
  }, [])

  // Handle bulk selection
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

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return

    if (!confirm(`Delete ${selectedContacts.size} contacts? This cannot be undone.`)) {
      return
    }

    try {
      const promises = Array.from(selectedContacts).map((id) =>
        fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      toast.success(`Deleted ${selectedContacts.size} contacts`)
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

  // Calculate pagination meta
  const paginationMeta: PaginationMeta = useMemo(() => ({
    total: stats.total,
    page: currentPage,
    limit: itemsPerPage,
    totalPages: Math.ceil(stats.total / itemsPerPage),
  }), [stats.total, currentPage, itemsPerPage])

  // Handle delete contact
  const handleDeleteContact = async () => {
    if (!contactToDelete) return

    try {
      const response = await fetch(`/api/contacts?id=${contactToDelete.id}`, {
        method: "DELETE",
      })
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

  // Handle opening contact detail drawer
  const handleOpenDrawer = (contact: Contact) => {
    setDrawerContact(contact)
    setDrawerOpen(true)
  }

  // Handle send message from drawer
  const handleSendMessage = (contact: Contact) => {
    toast.info(`Send message to ${contact.firstName} ${contact.lastName}`)
    // TODO: Implement send message functionality
  }

  // Handle edit from drawer
  const handleEditFromDrawer = (contact: Contact) => {
    setDrawerOpen(false)
    // The ContactFormDialog will handle the edit
  }

  // Handle delete from drawer
  const handleDeleteFromDrawer = (contact: Contact) => {
    setDrawerOpen(false)
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }

  // Export contacts as CSV
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
      if (!response.ok) {
        throw new Error('Failed to export contacts')
      }

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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Error state
  if (error) {
    return (
      <div className="bg-transparent px-2.5 border h-full lg:px-0">
        <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-gray-500">Manage your WhatsApp contacts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting}>
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <ImportContactsDialog onImportComplete={fetchContacts}>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Import
              </Button>
            </ImportContactsDialog>
            <ContactFormDialog onSuccess={fetchContacts}>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Contact
              </Button>
            </ContactFormDialog>
          </div>
        </div>

        <div className="border rounded-lg bg-white p-12 text-center">
          <RefreshCw className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Contacts</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchContacts} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading && contacts.length === 0) {
    return (
      <div className="bg-transparent px-2.5 border h-full lg:px-0">
        <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-gray-500">Manage your WhatsApp contacts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" disabled>
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button variant="outline" className="gap-2" disabled>
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button className="gap-2" disabled>
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </div>
        </div>

        <div className="border rounded-lg bg-white">
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
            <p className="text-gray-500">Loading contacts...</p>
          </div>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your audience and send WhatsApp messages
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting}>
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <ImportContactsDialog onImportComplete={fetchContacts}>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </ImportContactsDialog>
          <ContactFormDialog onSuccess={fetchContacts}>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </ContactFormDialog>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4 mr-2" />
            {sidebarOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {/* Segment Sidebar */}
        <Card className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
          <CardContent className="px-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Segments
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSegmentFilter('all')
                  setCurrentPage(1)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  segmentFilter === 'all'
                    ? 'bg-green-100 text-green-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>All Contacts</span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {stats.total}
                </span>
              </button>
              <button
                onClick={() => {
                  setSegmentFilter('opted_in')
                  setCurrentPage(1)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  segmentFilter === 'opted_in'
                    ? 'bg-green-100 text-green-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>Opted In</span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {stats.optedIn}
                </span>
              </button>
              <button
                onClick={() => {
                  setSegmentFilter('pending')
                  setCurrentPage(1)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  segmentFilter === 'pending'
                    ? 'bg-green-100 text-green-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>Pending</span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {stats.pending}
                </span>
              </button>
              <button
                onClick={() => {
                  setSegmentFilter('opted_out')
                  setCurrentPage(1)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  segmentFilter === 'opted_out'
                    ? 'bg-green-100 text-green-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>Opted Out</span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {stats.optedOut}
                </span>
              </button>
            </div>

            <div className="h-px bg-gray-200 my-4"></div>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Tags
            </div>
            <div className="space-y-1">
              {['VIP', 'Newsletter', 'Wholesale', 'Diwali-offer', 'Premium'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setTagFilter(tag)
                    setSegmentFilter('all')
                    setCurrentPage(1)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    tagFilter === tag
                      ? 'bg-green-100 text-green-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{tag}</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                    {contacts.filter((c) => {
                      const tags = parseTags(c.tags ?? null)
                      return tags.includes(tag)
                    }).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="h-px bg-gray-200 my-4"></div>

            <Button variant="outline" size="sm" className="w-full">
              + New Segment
            </Button>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div>
          {/* Bulk Action Bar */}
          {selectedContacts.size > 0 && (
            <div className="bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <span className="font-medium text-sm sm:text-base">
                {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <BulkTagDialog
                  selectedCount={selectedContacts.size}
                  onApply={handleBulkTag}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  >
                    Tag
                  </Button>
                </BulkTagDialog>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  onClick={() => handleBulkStatusChange('opted_in')}
                >
                  Mark Opted In
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  onClick={() => handleBulkStatusChange('opted_out')}
                >
                  Mark Opted Out
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white border-red-400"
                  onClick={handleBulkDelete}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 ml-auto"
                  onClick={handleClearSelection}
                >
                  ✕ Clear
                </Button>
              </div>
            </div>
          )}

          {/* Tag Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => {
                setTagFilter('all')
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                tagFilter === 'all'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-300 hover:text-green-700'
              }`}
            >
              All
            </button>
            {['VIP', 'Newsletter', 'Wholesale', 'Diwali-offer', 'Premium'].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setTagFilter(tag)
                  setSegmentFilter('all')
                  setCurrentPage(1)
                }}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  tagFilter === tag
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-300 hover:text-green-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Filter Bar - Green Theme like Template Management */}
          <div className="bg-green-950 rounded-t-3xl rounded-b-lg pt-4 pb-1 px-1 space-y-4">
            <div className="flex flex-row flex-wrap justify-between items-center px-2 gap-2 sm:gap-4">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[100px] sm:w-[140px] bg-green-900 border-green-700 text-white text-xs sm:text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="opted_in">Opted In</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="opted_out">Opted Out</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {(searchQuery || statusFilter !== "all" || lifecycleFilter !== 'all') && (
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

            <Select
              value={lifecycleFilter}
              onValueChange={(v) => {
                setLifecycleFilter(v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[120px] sm:w-[170px] bg-green-900 border-green-700 text-white text-xs sm:text-sm">
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

        {/* Contacts Table */}
        <div className="border border-green-800 rounded-lg bg-green-900/50 overflow-x-auto">
          <Table className="bg-white min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("firstName")}
                >
                  Name {renderSortIcon("firstName")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("phoneNumber")}
                >
                  Phone {renderSortIcon("phoneNumber")}
                </TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("optInStatus")}
                >
                  Status {renderSortIcon("optInStatus")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("createdAt")}
                >
                  Created On {renderSortIcon("createdAt")}
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-gray-500">No contacts found</p>
                      {stats.total === 0 ? (
                        <ContactFormDialog onSuccess={fetchContacts}>
                          <Button variant="outline">
                            Add your first contact
                          </Button>
                        </ContactFormDialog>
                      ) : (
                        <Button variant="ghost" onClick={resetFilters}>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact, index) => {
                  const status = statusConfig[contact.optInStatus as keyof typeof statusConfig]
                  const lifecycle = lifecycleConfig[(contact.lifecycleStatus || 'lead') as keyof typeof lifecycleConfig] || lifecycleConfig.lead
                  const StatusIcon = status?.icon || Clock
                  const contactTags = parseTags(contact.tags ?? null)
                  const avatarColor = getAvatarColor(index)
                  const initials = getInitials(contact.firstName, contact.lastName)

                  return (
                    <TableRow
                      key={contact.id}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedContacts.has(contact.id) ? 'bg-green-50' : ''
                      }`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                          aria-label={`Select ${contact.firstName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-3"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDrawer(contact)
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm hover:text-green-600 transition-colors">
                              {contact.firstName} {contact.lastName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {contact.email || "No email"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{contact.phoneNumber}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contactTags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contactTags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{contactTags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border', lifecycle.className)}>
                          {lifecycle.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {status && (
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
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(contact.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* View Details Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 transition-colors"
                            title="View Details"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDrawer(contact)
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Send Message Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                            title="Send Message"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSendMessage(contact)
                            }}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>

                          {/* Edit Button */}
                          <ContactFormDialog contact={contact} onSuccess={fetchContacts}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 transition-colors"
                              title="Edit"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </ContactFormDialog>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              setContactToDelete(contact)
                              setDeleteDialogOpen(true)
                            }}
                            title="Delete"
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
      </div>

      {/* Pagination Controls */}
      {paginationMeta.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            Page {paginationMeta.page} of {paginationMeta.totalPages}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
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
                      className="w-8"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
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
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {contactToDelete?.firstName}{" "}
              {contactToDelete?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteContact}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Drawer */}
      <ContactDetailDrawer
        contact={drawerContact}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={handleEditFromDrawer}
        onDelete={handleDeleteFromDrawer}
        onSendMessage={handleSendMessage}
      />
      </div>
    </div>
  )
}
