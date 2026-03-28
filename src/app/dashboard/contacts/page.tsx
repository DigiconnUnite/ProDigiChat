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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"

// Constants
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

// Types
interface Contact {
  id: string
  firstName: string
  lastName?: string | null
  phoneNumber: string
  email?: string | null
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

// Parse tags from JSON string
function parseTags(tags: string | null | undefined): string[] {
  if (!tags || typeof tags !== 'string') {
    return []
  }
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
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
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, sortConfig])

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
    setCurrentPage(1)
    setSortConfig({ field: 'createdAt', order: 'desc' })
  }, [])

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

  // Export contacts as CSV
  const handleExport = () => {
    const headers = ["First Name", "Last Name", "Phone", "Email", "Status", "Tags"]
    const rows = contacts.map(c => [
      c.firstName,
      c.lastName || "",
      c.phoneNumber,
      c.email || "",
      c.optInStatus,
      parseTags(c.tags).join(", "),
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "contacts.csv"
    a.click()
    URL.revokeObjectURL(url)
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
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-gray-500">Manage your WhatsApp contacts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export
            </Button>
            <ImportContactsDialog onImportComplete={fetchContacts}>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Import
              </Button>
            </ImportContactsDialog>
            <ContactFormDialog>
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
    )
  }

  // Loading state
  if (isLoading && contacts.length === 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
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
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-gray-500">
            Manage your WhatsApp contacts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <ImportContactsDialog onImportComplete={fetchContacts}>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </ImportContactsDialog>
          <ContactFormDialog>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </ContactFormDialog>
        </div>
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
          {(searchQuery || statusFilter !== "all") && (
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

        {/* Contacts Table */}
        <div className="border border-green-800 rounded-lg bg-green-900/50 overflow-hidden">
          <Table className="bg-white">
            <TableHeader>
              <TableRow className="bg-gray-50">
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
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-gray-500">No contacts found</p>
                      {stats.total === 0 ? (
                        <ContactFormDialog>
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
                contacts.map((contact) => {
                  const status = statusConfig[contact.optInStatus as keyof typeof statusConfig]
                  const StatusIcon = status?.icon || Clock
                  const contactTags = parseTags(contact.tags ?? null)

                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {contact.email || "No email"}
                          </span>
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
                          {/* Send Message Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Send Message"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>

                          {/* Edit Button */}
                          <ContactFormDialog contact={contact}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </ContactFormDialog>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
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
    </div>
  )
}
