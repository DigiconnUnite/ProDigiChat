"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
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
  AlertTriangle,
  Users,
  BarChart3,
  Zap,
  Filter,
  X,
  MessageSquare,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
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

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function transformCampaign(apiCampaign: ApiCampaign): Campaign {
  let stats: CampaignStats = { totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 }
  try {
    if (apiCampaign.stats) {
      stats = JSON.parse(apiCampaign.stats)
    }
  } catch (e) {
    console.error('Error parsing stats:', e)
  }

  const totalSent = stats.totalSent || 0
  let deliveryRate: number | null = null
  let readRate: number | null = null
  let clickRate: number | null = null

  if (totalSent > 0) {
    deliveryRate = (stats.delivered / totalSent) * 100
    readRate = (stats.read / totalSent) * 100
    clickRate = (stats.clicked / totalSent) * 100
  }

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

const statusConfig: Record<string, { icon: any; label: string; badgeClass: string }> = {
  draft: {
    icon: Clock,
    label: "Draft",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
  },
  scheduled: {
    icon: Calendar,
    label: "Scheduled",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200"
  },
  running: {
    icon: Play,
    label: "Running",
    badgeClass: "bg-green-100 text-green-800 border-green-200"
  },
  paused: {
    icon: Pause,
    label: "Paused",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200"
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    badgeClass: "bg-red-100 text-red-800 border-red-200"
  },
}

const typeConfig: Record<string, { label: string; badgeClass: string }> = {
  broadcast: { label: "Broadcast", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  recurring: { label: "Recurring", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  ab_test: { label: "A/B Test", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CampaignsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'scheduledDate',
    order: 'desc',
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [campaignsData, setCampaignsData] = useState<Campaign[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const url = '/api/campaigns?limit=1000'
      const response = await fetch(url)
      const result: ApiResponse = await response.json()

      if (result.success && result.data) {
        const transformedCampaigns = result.data.map(transformCampaign)
        setCampaignsData(transformedCampaigns)
      } else {
        setError(result.error || 'Failed to fetch campaigns')
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err)
      setError('Failed to load campaigns. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [])

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
      ? <span className="ml-1 text-green-600">↑</span>
      : <span className="ml-1 text-green-600">↓</span>
  }

  const filteredCampaigns = useMemo(() => {
    return campaignsData.filter((campaign) => {
      const matchesSearch =
        searchQuery === "" ||
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === "all" || campaign.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [campaignsData, searchQuery, statusFilter])

  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      let comparison = 0
      switch (sortConfig.field) {
        case 'name': comparison = a.name.localeCompare(b.name); break
        case 'type': comparison = a.type.localeCompare(b.type); break
        case 'status': comparison = a.status.localeCompare(b.status); break
        case 'audienceSize': comparison = a.audienceSize - b.audienceSize; break
        case 'scheduledDate': comparison = a.scheduledDate.localeCompare(b.scheduledDate); break
        default: comparison = 0
      }
      return sortConfig.order === 'asc' ? comparison : -comparison
    })
  }, [filteredCampaigns, sortConfig])

  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedCampaigns.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedCampaigns, currentPage, itemsPerPage])

  const stats = useMemo(() => ({
    total: campaignsData.length,
    active: campaignsData.filter(c => c.status === 'running').length,
    scheduled: campaignsData.filter(c => c.status === 'scheduled').length,
    avgDelivery: campaignsData.filter(c => c.deliveryRate !== null)
      .reduce((acc, c) => acc + (c.deliveryRate || 0), 0) /
      (campaignsData.filter(c => c.deliveryRate !== null).length || 1)
  }), [campaignsData])

  const paginationMeta: PaginationMeta = useMemo(() => ({
    total: sortedCampaigns.length,
    page: currentPage,
    limit: itemsPerPage,
    totalPages: Math.ceil(sortedCampaigns.length / itemsPerPage),
  }), [sortedCampaigns.length, currentPage, itemsPerPage])

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= paginationMeta.totalPages) {
      setCurrentPage(page)
    }
  }, [paginationMeta.totalPages])

  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('all')
    setCurrentPage(1)
    setSortConfig({ field: 'scheduledDate', order: 'desc' })
  }, [])

  const handleViewCampaign = useCallback((campaign: Campaign) => {
    router.push(`/dashboard/campaigns/${campaign.id}`)
  }, [router])

  const handleDuplicateCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/duplicate`, { method: 'POST' })
      const result = await response.json()
      if (result.success) fetchCampaigns()
      else setError(result.error || 'Failed to duplicate campaign')
    } catch (err) {
      setError('Failed to duplicate campaign')
    } finally {
      setActionLoading(null)
    }
  }, [fetchCampaigns])

  const handlePauseCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/pause`, { method: 'POST' })
      const result = await response.json()
      if (result.success) fetchCampaigns()
      else setError(result.error || 'Failed to pause campaign')
    } catch (err) {
      setError('Failed to pause campaign')
    } finally {
      setActionLoading(null)
    }
  }, [fetchCampaigns])

  const handleResumeCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/resume`, { method: 'POST' })
      const result = await response.json()
      if (result.success) fetchCampaigns()
      else setError(result.error || 'Failed to resume campaign')
    } catch (err) {
      setError('Failed to resume campaign')
    } finally {
      setActionLoading(null)
    }
  }, [fetchCampaigns])

  const handleLaunchCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/launch`, { method: 'POST' })
      const result = await response.json()
      if (result.success) fetchCampaigns()
      else setError(result.error || 'Failed to launch campaign')
    } catch (err) {
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
      const response = await fetch(`/api/campaigns/${campaignToDelete.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) fetchCampaigns()
      else setError(result.error || 'Failed to delete campaign')
    } catch (err) {
      setError('Failed to delete campaign')
    } finally {
      setActionLoading(null)
      setDeleteDialogOpen(false)
      setCampaignToDelete(null)
    }
  }, [campaignToDelete, fetchCampaigns])

  // ═══════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════

  if (error) {
    return (
      <div className="bg-transparent px-2.5 lg:px-0">
        <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-foreground text-3xl font-bold mb-2">Campaigns</h1>
              <p className="text-muted-foreground text-lg">Create and manage your marketing campaigns</p>
            </div>
            <Button
              className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
              onClick={() => router.push("/dashboard/campaigns/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>

          <div className="p-5 rounded-xl border-2 border-red-400 bg-red-50 text-center py-16">
            <div className="h-14 w-14 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Campaigns</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={fetchCampaigns} variant="outline" className="rounded-lg border-slate-300 text-sm">
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

  if (isLoading) {
    return (
      <div className="bg-transparent px-2.5 lg:px-0">
        <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-foreground text-3xl font-bold mb-2">Campaigns</h1>
              <p className="text-muted-foreground text-lg">Create and manage your marketing campaigns</p>
            </div>
            <Button disabled className="rounded-lg bg-green-600 text-white text-sm">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
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
    <div className="bg-transparent px-2.5 lg:px-0 h-[87vh]">
      <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10 pb-20 h-[87vh]">

        {/* ═══ Page Header ═══ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-foreground text-3xl font-bold mb-2">Campaigns</h1>
            <p className="text-muted-foreground text-lg">Create and manage your marketing campaigns</p>
          </div>
          <Button
            className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
            onClick={() => router.push("/dashboard/campaigns/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        
        {/* ═══ Filter & Table Card ═══ */}
        <div className="rounded-xl ">

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="pl-10 text-sm rounded-lg border-slate-300 h-10 bg-white"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}
            >
              <SelectTrigger className="w-[160px] text-sm rounded-lg border-slate-300 h-10 bg-white">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

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
            {(searchQuery || statusFilter !== "all") && (
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
          <div className="rounded-xl border-2 border-green-950 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-green-950">
                <TableRow className="bg-green-950 hover:bg-green-950">
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort("name")}
                  >
                    Campaign {renderSortIcon("name")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort("type")}
                  >
                    Type {renderSortIcon("type")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort("status")}
                  >
                    Status {renderSortIcon("status")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 text-right hover:bg-green-950"
                    onClick={() => handleSort("audienceSize")}
                  >
                    Audience {renderSortIcon("audienceSize")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs font-semibold text-muted py-3 px-4 hover:bg-green-950"
                    onClick={() => handleSort("scheduledDate")}
                  >
                    Scheduled {renderSortIcon("scheduledDate")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted py-3 px-4 text-right">Delivery</TableHead>
                  <TableHead className="text-xs font-semibold text-muted py-3 px-4 text-right">Read</TableHead>
                  <TableHead className="text-xs font-semibold text-muted py-3 px-4 text-right">Clicks</TableHead>
                  <TableHead className="text-xs font-semibold text-muted py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {paginatedCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
                          <MessageSquare className="h-7 w-7 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No campaigns found</p>
                        {campaignsData.length === 0 ? (
                          <Button
                            variant="outline"
                            className="rounded-lg border-slate-300 text-sm"
                            onClick={() => router.push("/dashboard/campaigns/new")}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create your first campaign
                          </Button>
                        ) : (
                          <Button variant="ghost" className="rounded-lg text-sm" onClick={resetFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCampaigns.map((campaign) => {
                    const status = statusConfig[campaign.status]
                    const StatusIcon = status?.icon || Clock
                    const typeInfo = typeConfig[campaign.type]

                    return (
                      <TableRow key={campaign.id} className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="py-3.5 px-4">
                          <button
                            onClick={() => handleViewCampaign(campaign)}
                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left"
                          >
                            {campaign.name}
                          </button>
                          {campaign.audienceName && (
                            <p className="text-xs text-muted-foreground mt-0.5">{campaign.audienceName}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          {typeInfo ? (
                            <Badge className={cn("text-xs border", typeInfo.badgeClass)}>
                              {typeInfo.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground capitalize">{campaign.type}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          {status && (
                            <Badge className={cn("text-xs border flex items-center gap-1.5 w-fit", status.badgeClass)}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          <span className="text-sm font-mono text-foreground">
                            {campaign.audienceSize.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <span className={cn(
                            "text-xs",
                            campaign.scheduledDate === 'Not scheduled' ? 'text-muted-foreground' : 'text-foreground'
                          )}>
                            {campaign.scheduledDate}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          {campaign.deliveryRate !== null ? (
                            <span className="text-sm font-semibold text-green-700">{campaign.deliveryRate}%</span>
                          ) : (
                            <span className="text-sm text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          {campaign.readRate !== null ? (
                            <span className="text-sm font-semibold text-blue-700">{campaign.readRate}%</span>
                          ) : (
                            <span className="text-sm text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          {campaign.clickRate !== null ? (
                            <span className="text-sm font-semibold text-amber-700">{campaign.clickRate}%</span>
                          ) : (
                            <span className="text-sm text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="View"
                              onClick={() => handleViewCampaign(campaign)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
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

                            {campaign.status === "running" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                title="Pause"
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
                                className="rounded-lg h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Resume"
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
                                className="rounded-lg h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Launch"
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

                            {['draft', 'completed', 'failed', 'paused'].includes(campaign.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                title="Delete"
                                disabled={actionLoading === campaign.id}
                                onClick={() => handleDeleteClick(campaign)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
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
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
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
              Delete Campaign
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{campaignToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              All campaign data, statistics, and message history will be permanently removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-lg border-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="rounded-lg bg-red-600 hover:bg-red-700 text-white"
              disabled={actionLoading !== null}
            >
              {actionLoading === campaignToDelete?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
