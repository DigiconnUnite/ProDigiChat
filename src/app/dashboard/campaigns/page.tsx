"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Calendar,
  Copy,
  Trash2,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

// Constants
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

// Types
interface CampaignStats {
  totalSent: number
  delivered: number
  read: number
  failed: number
  clicked: number
}

interface CampaignSchedule {
  sendNow?: boolean
  scheduledAt?: string
  timezone?: string
  throttleRate?: number
}

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  audienceSize: number
  scheduledDate: string
  deliveryRate: number | null
  readRate: number | null
  clickRate: number | null
  createdAt: string
  audienceName?: string
}

interface ApiCampaign {
  id: string
  name: string
  type: string
  status: string
  schedule: string | null
  stats: string
  createdAt: string
  audience: {
    id: string
    name: string
    _count: {
      members: number
    }
  } | null
  creator: {
    name: string | null
  } | null
}

interface ApiResponse {
  success: boolean
  data?: ApiCampaign[]
  total?: number
  error?: string
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

type SortField = 'name' | 'type' | 'status' | 'audienceSize' | 'scheduledDate'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  order: SortOrder
}

// Transform API response to Campaign interface
function transformCampaign(apiCampaign: ApiCampaign): Campaign {
  // Parse stats JSON
  let stats: CampaignStats = { totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 }
  try {
    if (apiCampaign.stats) {
      stats = JSON.parse(apiCampaign.stats)
    }
  } catch (e) {
    console.error('Error parsing stats:', e)
  }

  // Calculate rates
  const totalSent = stats.totalSent || 0
  let deliveryRate: number | null = null
  let readRate: number | null = null
  let clickRate: number | null = null
  
  if (totalSent > 0) {
    deliveryRate = (stats.delivered / totalSent) * 100
    readRate = (stats.read / totalSent) * 100
    clickRate = (stats.clicked / totalSent) * 100
  }

  // Parse schedule JSON
  let scheduledDate = 'Not scheduled'
  try {
    if (apiCampaign.schedule) {
      const scheduleObj: CampaignSchedule = JSON.parse(apiCampaign.schedule)
      if (scheduleObj.sendNow === true) {
        scheduledDate = 'Send Now'
      } else if (scheduleObj.scheduledAt) {
        const date = new Date(scheduleObj.scheduledAt)
        scheduledDate = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      }
    }
  } catch (e) {
    console.error('Error parsing schedule:', e)
  }

  return {
    id: apiCampaign.id,
    name: apiCampaign.name,
    type: apiCampaign.type,
    status: apiCampaign.status,
    audienceSize: apiCampaign.audience?._count?.members || 0,
    scheduledDate,
    deliveryRate: deliveryRate !== null ? Math.round(deliveryRate * 10) / 10 : null,
    readRate: readRate !== null ? Math.round(readRate * 10) / 10 : null,
    clickRate: clickRate !== null ? Math.round(clickRate * 10) / 10 : null,
    createdAt: apiCampaign.createdAt,
    audienceName: apiCampaign.audience?.name
  }
}

const statusConfig = {
  draft: { 
    icon: Clock, 
    label: "Draft", 
    color: "text-gray-600", 
    borderColor: "border-gray-200",
    bg: "bg-gray-50" 
  },
  scheduled: { 
    icon: Calendar, 
    label: "Scheduled", 
    color: "text-blue-600", 
    borderColor: "border-blue-200",
    bg: "bg-blue-50" 
  },
  running: { 
    icon: Play, 
    label: "Running", 
    color: "text-green-600", 
    borderColor: "border-green-200",
    bg: "bg-green-50" 
  },
  paused: { 
    icon: Pause, 
    label: "Paused", 
    color: "text-yellow-600", 
    borderColor: "border-yellow-200",
    bg: "bg-yellow-50" 
  },
  completed: { 
    icon: CheckCircle2, 
    label: "Completed", 
    color: "text-gray-600", 
    borderColor: "border-gray-200",
    bg: "bg-gray-50" 
  },
  failed: { 
    icon: AlertCircle, 
    label: "Failed", 
    color: "text-red-600", 
    borderColor: "border-red-200",
    bg: "bg-red-50" 
  },
}

const typeConfig: Record<string, { label: string; color: string }> = {
  broadcast: { label: "Broadcast", color: "text-purple-600 bg-purple-50" },
  recurring: { label: "Recurring", color: "text-teal-600 bg-teal-50" },
  ab_test: { label: "A/B Test", color: "text-orange-600 bg-orange-50" },
}

export default function CampaignsPage() {
  const router = useRouter()
  // Filter states - initialize with explicit default values
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)
  
  // Sorting states
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'scheduledDate',
    order: 'desc',
  })

  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [campaignsData, setCampaignsData] = useState<Campaign[]>([])
  
  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)

  // Fetch campaigns from API - fetches all campaigns for client-side pagination
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch all campaigns without pagination limit for client-side processing
      const url = '/api/campaigns?limit=1000'
      console.log('[DEBUG] Fetching campaigns from:', url)
      
      const response = await fetch(url)
      const result: ApiResponse = await response.json()
      
      if (result.success && result.data) {
        const transformedCampaigns = result.data.map(transformCampaign)
        setCampaignsData(transformedCampaigns)
        console.log('[DEBUG] Campaigns fetched:', transformedCampaigns.length)
      } else {
        console.log('[DEBUG] API returned error:', result.error)
        setError(result.error || 'Failed to fetch campaigns')
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err)
      setError('Failed to load campaigns. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchCampaigns()
  }, [])

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

  // Filter campaigns
const filteredCampaigns = useMemo(() => {
  return campaignsData.filter((campaign) => {
    const matchesSearch =
      searchQuery === "" ||
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}, [campaignsData, searchQuery, statusFilter]);

  // Sort campaigns
  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      let comparison = 0
      
      switch (sortConfig.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'audienceSize':
          comparison = a.audienceSize - b.audienceSize
          break
        case 'scheduledDate':
          comparison = a.scheduledDate.localeCompare(b.scheduledDate)
          break
        default:
          comparison = 0
      }
      
      return sortConfig.order === 'asc' ? comparison : -comparison
    })
  }, [filteredCampaigns, sortConfig])

  // Paginate campaigns
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedCampaigns.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedCampaigns, currentPage, itemsPerPage])

  // Calculate stats
  const stats = useMemo(() => ({
    total: campaignsData.length,
    active: campaignsData.filter(c => c.status === 'running').length,
    scheduled: campaignsData.filter(c => c.status === 'scheduled').length,
    avgDelivery: campaignsData.filter(c => c.deliveryRate !== null)
      .reduce((acc, c) => acc + (c.deliveryRate || 0), 0) / 
      campaignsData.filter(c => c.deliveryRate !== null).length || 0
  }), [campaignsData])

  // Calculate pagination meta
  const paginationMeta: PaginationMeta = useMemo(() => ({
    total: sortedCampaigns.length,
    page: currentPage,
    limit: itemsPerPage,
    totalPages: Math.ceil(sortedCampaigns.length / itemsPerPage),
  }), [sortedCampaigns.length, currentPage, itemsPerPage])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= paginationMeta.totalPages) {
      setCurrentPage(page)
    }
  }, [paginationMeta.totalPages])

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
    setSortConfig({ field: 'scheduledDate', order: 'desc' })
  }, [])

  // Handle campaign actions
  const handleViewCampaign = useCallback((campaign: Campaign) => {
    router.push(`/dashboard/campaigns/${campaign.id}`)
  }, [router])

  const handleDuplicateCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/duplicate`, {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        fetchCampaigns()
      } else {
        setError(result.error || 'Failed to duplicate campaign')
      }
    } catch (err) {
      console.error('Error duplicating campaign:', err)
      setError('Failed to duplicate campaign')
    } finally {
      setActionLoading(null)
    }
  }, [fetchCampaigns])

  const handlePauseCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/pause`, {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        fetchCampaigns()
      } else {
        setError(result.error || 'Failed to pause campaign')
      }
    } catch (err) {
      console.error('Error pausing campaign:', err)
      setError('Failed to pause campaign')
    } finally {
      setActionLoading(null)
    }
  }, [fetchCampaigns])

  const handleResumeCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/resume`, {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        fetchCampaigns()
      } else {
        setError(result.error || 'Failed to resume campaign')
      }
    } catch (err) {
      console.error('Error resuming campaign:', err)
      setError('Failed to resume campaign')
    } finally {
      setActionLoading(null)
    }
  }, [fetchCampaigns])

  const handleLaunchCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/launch`, {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        fetchCampaigns()
      } else {
        setError(result.error || 'Failed to launch campaign')
      }
    } catch (err) {
      console.error('Error launching campaign:', err)
      setError('Failed to launch campaign')
    } finally {
      setActionLoading(null)
    }
  }, [fetchCampaigns])

  const handleDeleteClick = useCallback((campaign: Campaign) => {
    setCampaignToDelete(campaign)
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!campaignToDelete) return
    
    setActionLoading(campaignToDelete.id)
    try {
      const response = await fetch(`/api/campaigns/${campaignToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      
      if (result.success) {
        fetchCampaigns()
      } else {
        setError(result.error || 'Failed to delete campaign')
      }
    } catch (err) {
      console.error('Error deleting campaign:', err)
      setError('Failed to delete campaign')
    } finally {
      setActionLoading(null)
      setDeleteDialogOpen(false)
      setCampaignToDelete(null)
    }
  }, [campaignToDelete, fetchCampaigns])

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
            <p className="text-gray-500">Create and manage your marketing campaigns</p>
          </div>
          <Button className="gap-2" onClick={() => router.push("/dashboard/campaigns/new")}>
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </div>

        <div className="border rounded-lg bg-white p-12 text-center">
          <RefreshCw className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Campaigns</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchCampaigns} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
            <p className="text-gray-500">Create and manage your marketing campaigns</p>
          </div>
          <Button className="gap-2" disabled>
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </div>

        <div className="border rounded-lg bg-white">
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
            <p className="text-gray-500">Loading campaigns...</p>
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
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-gray-500">
            Create and manage your marketing campaigns
          </p>
        </div>
        <Button className="gap-2" onClick={() => router.push("/dashboard/campaigns/new")}>
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      {/* Filter Bar - Green Theme */}
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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

        {/* Campaigns Table */}
        <div className="border border-green-800 rounded-lg bg-green-900/50 overflow-hidden">
          <Table className="bg-white">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("name")}
                >
                  Campaign Name {renderSortIcon("name")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("type")}
                >
                  Type {renderSortIcon("type")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("status")}
                >
                  Status {renderSortIcon("status")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("audienceSize")}
                >
                  Audience {renderSortIcon("audienceSize")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 font-semibold"
                  onClick={() => handleSort("scheduledDate")}
                >
                  Scheduled {renderSortIcon("scheduledDate")}
                </TableHead>
                <TableHead className="font-semibold">Delivery</TableHead>
                <TableHead className="font-semibold">Read</TableHead>
                <TableHead className="font-semibold">Clicks</TableHead>
                <TableHead className="font-semibold text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {paginatedCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-gray-500">No campaigns found</p>
                      {campaignsData.length === 0 ? (
                        <Button variant="outline">
                          Create your first campaign
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
                paginatedCampaigns.map((campaign) => {
                  const status = statusConfig[campaign.status as keyof typeof statusConfig]
                  const StatusIcon = status.icon
                  const typeInfo = typeConfig[campaign.type]

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <span className="font-medium">{campaign.name}</span>
                      </TableCell>
                      <TableCell>
                        {typeInfo && (
                          <Badge variant="outline" className={cn("capitalize", typeInfo.color)}>
                            {typeInfo.label}
                          </Badge>
                        )}
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
                        <span className="font-mono text-sm">
                          {campaign.audienceSize.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {campaign.scheduledDate}
                        </span>
                      </TableCell>
                      <TableCell>
                        {campaign.deliveryRate !== null ? (
                          <span className="text-sm font-medium text-green-600">
                            {campaign.deliveryRate}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.readRate !== null ? (
                          <span className="text-sm font-medium text-blue-600">
                            {campaign.readRate}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.clickRate !== null ? (
                          <span className="text-sm font-medium text-yellow-600">
                            {campaign.clickRate}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* View Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            title="View Report"
                            onClick={() => handleViewCampaign(campaign)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Duplicate Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            title="Duplicate"
                            disabled={actionLoading === campaign.id}
                            onClick={() => handleDuplicateCampaign(campaign)}
                          >
                            {actionLoading === campaign.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          {/* Status-specific actions */}
                          {campaign.status === "running" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                              title="Pause Campaign"
                              disabled={actionLoading === campaign.id}
                              onClick={() => handlePauseCampaign(campaign)}
                            >
                              {actionLoading === campaign.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}

                          {campaign.status === "paused" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Resume Campaign"
                              disabled={actionLoading === campaign.id}
                              onClick={() => handleResumeCampaign(campaign)}
                            >
                              {actionLoading === campaign.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}

                          {campaign.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Launch Campaign"
                              disabled={actionLoading === campaign.id}
                              onClick={() => handleLaunchCampaign(campaign)}
                            >
                              {actionLoading === campaign.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                            disabled={actionLoading === campaign.id || !['draft', 'completed', 'failed', 'paused'].includes(campaign.status)}
                            onClick={() => handleDeleteClick(campaign)}
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading !== null}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
