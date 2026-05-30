"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, AlertCircle,
  Play, Pause, BarChart3, TrendingUp, MessageSquare,
  Users, Send, ChevronLeft, ChevronRight, Filter,
  AlertTriangle, Phone, XCircle, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// ─── Types ───

interface CampaignStats {
  totalMessages: number
  totalSent: number
  delivered: number
  read: number
  failed: number
  pending: number
}

interface FailureReason {
  reason: string
  count: number
}

interface FailureAnalysis {
  reasons: FailureReason[]
  totalFailed: number
  failureRate: string
  note?: string
}

interface MessagesPagination {
  page: number
  pageSize: number
  totalMessages: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface CampaignMessage {
  id: string
  status: string
  failureReason: string | null
  errorMessage: string | null
  providerMsgId?: string | null
  sentAt?: string | null
  failedAt?: string | null
  createdAt: string
  contact?: {
    id: string
    firstName: string | null
    lastName: string | null
    phoneNumber: string
  } | null
}

interface CampaignDetail {
  id: string
  name: string
  description?: string | null
  type: string
  status: string
  createdAt: string
  schedule: string | null
  stats: string
  computedStats?: CampaignStats
  failureAnalysis?: FailureAnalysis
  messagesPagination?: MessagesPagination
  messageContent: string
  audience?: {
    _count?: { members: number }
    name?: string | null
  } | null
  creator?: {
    name: string | null
    email: string | null
  } | null
  messages?: CampaignMessage[]
}

interface CampaignResponse {
  success: boolean
  data?: CampaignDetail
  error?: string
}

// ─── Config ───

const statusConfig = {
  draft:     { icon: Clock,       label: "Draft",     badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  scheduled: { icon: Calendar,    label: "Scheduled", badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
  running:   { icon: Play,        label: "Running",   badgeClass: "bg-green-100 text-green-800 border-green-200" },
  paused:    { icon: Pause,       label: "Paused",    badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  completed: { icon: CheckCircle2, label: "Completed", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  failed:    { icon: AlertCircle,  label: "Failed",   badgeClass: "bg-red-100 text-red-800 border-red-200" },
} as const

const FAILURE_REASON_LABELS: Record<string, { label: string; description: string }> = {
  RECIPIENT_NOT_ON_WHATSAPP: { label: "Not on WhatsApp", description: "The phone number is not registered on WhatsApp" },
  INVALID_PHONE_NUMBER:      { label: "Invalid Number",   description: "The phone number format is invalid" },
  RECIPIENT_BLOCKED_BUSINESS:{ label: "Blocked",          description: "The recipient has blocked your business" },
  RECIPIENT_OPTED_OUT:       { label: "Opted Out",        description: "The recipient has opted out of messages" },
  TEMPLATE_NOT_APPROVED:     { label: "Template Issue",   description: "The WhatsApp template is not approved" },
  RATE_LIMITED:              { label: "Rate Limited",     description: "Too many messages sent too quickly" },
  DAILY_LIMIT_EXCEEDED:      { label: "Daily Limit",      description: "Daily message sending limit reached" },
  TIMEOUT:                   { label: "Timeout",          description: "The message send timed out" },
  NETWORK_ERROR:             { label: "Network Error",    description: "Network connectivity issue" },
  PERMISSION_DENIED:         { label: "Permission Error",  description: "Insufficient permissions to send" },
  INVALID_RECIPIENT:         { label: "Invalid Recipient", description: "The recipient cannot receive messages" },
  INTERNAL_ERROR:            { label: "Internal Error",   description: "An internal system error occurred" },
  UNKNOWN_ERROR:             { label: "Unknown Error",    description: "An unknown error occurred" },
}

const messageStatusConfig: Record<string, { label: string; badgeClass: string }> = {
  pending:   { label: "Pending",   badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  sending:   { label: "Sending",   badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
  sent:      { label: "Sent",      badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  delivered: { label: "Delivered", badgeClass: "bg-green-100 text-green-800 border-green-200" },
  read:      { label: "Read",      badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
  failed:    { label: "Failed",    badgeClass: "bg-red-100 text-red-800 border-red-200" },
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

// ─── Campaign Status Badge Helper ───

function getCampaignStatusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    running:   { bg: "bg-green-100",  text: "text-green-800",  label: "Active" },
    active:    { bg: "bg-green-100",  text: "text-green-800",  label: "Active" },
    scheduled: { bg: "bg-blue-100",   text: "text-blue-800",   label: "Scheduled" },
    paused:    { bg: "bg-yellow-100", text: "text-yellow-800", label: "Paused" },
    completed: { bg: "bg-slate-100",  text: "text-slate-700",  label: "Completed" },
    draft:     { bg: "bg-gray-100",   text: "text-gray-700",   label: "Draft" },
    failed:    { bg: "bg-red-100",    text: "text-red-800",    label: "Failed" },
  }
  const cfg = map[status.toLowerCase()] ?? { bg: "bg-gray-100", text: "text-gray-700", label: status }
  return (
    <Badge className={`${cfg.bg} ${cfg.text} border-0`}>{cfg.label}</Badge>
  )
}

// ─── Stat Card Component ───

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg = "bg-green-50",
  iconColor = "text-green-600",
  valueColor,
}: {
  label: string
  value: string | number
  icon: any
  iconBg?: string
  iconColor?: string
  valueColor?: string
}) {
  return (
    <div className="p-5 rounded-xl bg-white border-2 border-green-950 transition-all hover:shadow-md group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      <div className={cn("text-2xl font-bold", valueColor || "text-foreground")}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}

// ─── Failure Reason Badge ───

function FailureReasonBadge({ reason }: { reason: string }) {
  const config = FAILURE_REASON_LABELS[reason]
  if (!config) {
    return (
      <div className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
        {reason}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <div className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
        {config.label}
      </div>
      <p className="text-[10px] text-muted-foreground px-2">{config.description}</p>
    </div>
  )
}

// ─── Main Component ───

export default function CampaignReportPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const campaignId = params?.id

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchCampaign = useCallback(async (page: number = 1, status?: string | null) => {
    if (!campaignId) return
    setIsRefreshing(true)

    try {
      const queryParams = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (status) queryParams.set('status', status)

      const response = await fetch(`/api/campaigns/${campaignId}?${queryParams}`)
      const result: CampaignResponse = await response.json()

      if (!result.success || !result.data) {
        setError(result.error || "Failed to load campaign")
        return
      }

      setCampaign(result.data)
    } catch (err) {
      console.error("Failed to load campaign report:", err)
      setError("Failed to load campaign report")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchCampaign(1)
  }, [fetchCampaign])

  useEffect(() => {
    if (campaign?.name) {
      document.title = `${campaign.name} — Campaign Report`
    }
  }, [campaign?.name])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchCampaign(newPage, statusFilter)
  }

  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status)
    setCurrentPage(1)
    fetchCampaign(1, status)
  }

  const handleRefresh = () => {
    fetchCampaign(currentPage, statusFilter)
  }

  // ─── Computed Values ───

  const stats = useMemo<CampaignStats>(() => {
    // Prefer computedStats from API (real DB counts)
    if (campaign?.computedStats) return campaign.computedStats

    // Fallback to parsing the stored stats JSON
    if (campaign?.stats) {
      try {
        return JSON.parse(campaign.stats)
      } catch {
        return { totalMessages: 0, totalSent: 0, delivered: 0, read: 0, failed: 0, pending: 0 }
      }
    }
    return { totalMessages: 0, totalSent: 0, delivered: 0, read: 0, failed: 0, pending: 0 }
  }, [campaign?.computedStats, campaign?.stats])

  const failureAnalysis = campaign?.failureAnalysis

  const schedule = useMemo(() => {
    if (!campaign?.schedule) return null
    try { return JSON.parse(campaign.schedule) }
    catch { return null }
  }, [campaign?.schedule])

  const messageContent = useMemo(() => {
    if (!campaign?.messageContent) return null
    try { return JSON.parse(campaign.messageContent) }
    catch { return null }
  }, [campaign?.messageContent])

  const pagination = campaign?.messagesPagination

  const status = campaign ? statusConfig[campaign.status as keyof typeof statusConfig] : null
  const StatusIcon = status?.icon

  const deliveryRate = stats.totalSent > 0 ? (stats.delivered / stats.totalSent) * 100 : 0
  const readRate = stats.delivered > 0 ? (stats.read / stats.delivered) * 100 : 0
  const failureRate = stats.totalMessages > 0 ? (stats.failed / stats.totalMessages) * 100 : 0

  // ─── Loading State ───

  if (isLoading) {
    return (
      <div className="bg-transparent px-2.5 lg:px-0">
        <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/campaigns")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </div>
          <div className="p-5 rounded-xl border-2 border-green-950 bg-white">
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Error State ───

  if (error || !campaign) {
    return (
      <div className="bg-transparent px-2.5 lg:px-0">
        <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/campaigns")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </div>
          <div className="p-5 rounded-xl border-2 border-red-400 bg-red-50">
            <div className="flex flex-col items-center gap-3 text-center py-8">
              <div className="h-14 w-14 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Error Loading Campaign</h3>
              <p className="text-muted-foreground text-sm max-w-md">{error || "Campaign not found"}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ───

  return (
    <div className="bg-transparent px-2.5 lg:px-0 min-h-[87vh]">
      <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 py-10 pb-20">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-foreground text-3xl font-bold mb-2">{campaign.name}</h1>
              <p className="text-muted-foreground text-lg">Campaign report and performance analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            {campaign.status && getCampaignStatusBadge(campaign.status)}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard label="Total Messages" value={stats.totalMessages} icon={Send} />
          <StatCard
            label="Delivery Rate"
            value={`${deliveryRate.toFixed(1)}%`}
            icon={CheckCircle2}
            valueColor={deliveryRate >= 90 ? "text-green-700" : deliveryRate >= 70 ? "text-amber-700" : "text-red-700"}
          />
          <StatCard
            label="Read Rate"
            value={`${readRate.toFixed(1)}%`}
            icon={MessageSquare}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Failure Rate"
            value={`${failureRate.toFixed(1)}%`}
            icon={AlertTriangle}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            valueColor={failureRate <= 5 ? "text-green-700" : failureRate <= 15 ? "text-amber-700" : "text-red-700"}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            iconBg="bg-slate-50"
            iconColor="text-slate-600"
          />
        </div>

        {/* Campaign Overview & Performance Details */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="p-5 rounded-xl bg-white border-2 border-green-950">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-foreground">Campaign Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                  {campaign.type.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Audience Size</span>
                <span className="text-sm font-semibold text-foreground">{campaign.audience?._count?.members?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm text-foreground">{formatDate(campaign.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Scheduled</span>
                <span className="text-sm text-foreground">
                  {schedule?.scheduledAt ? formatDate(schedule.scheduledAt) : (schedule?.sendNow ? "Send Now" : "Not scheduled")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm text-foreground">{formatDate(campaign.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created By</span>
                <span className="text-sm text-foreground">{campaign.creator?.name || campaign.creator?.email || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Scheduled</span>
                <span className="text-sm text-foreground">
                  {schedule?.scheduledAt ? formatDate(schedule.scheduledAt) : (schedule?.sendNow ? "Send Now" : "Not scheduled")}
                </span>
              </div>
              {schedule?.timezone && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Timezone</span>
                  <span className="text-sm text-foreground">{schedule.timezone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Performance Details */}
          <div className="p-5 rounded-xl bg-white border-2 border-green-950">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-foreground">Performance Breakdown</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-green-700">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-green-700">{stats.read}</p>
                <p className="text-xs text-muted-foreground">Read</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-green-700">{stats.totalSent}</p>
                <p className="text-xs text-muted-foreground">Sent (Not Yet Delivered)</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            {/* Progress bar */}
            {stats.totalMessages > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>
                    {((stats.delivered + stats.read + stats.failed) / stats.totalMessages * 100).toFixed(1)}% complete
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  {stats.delivered > 0 && (
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${(stats.delivered / stats.totalMessages) * 100}%` }}
                    />
                  )}
                  {stats.read > 0 && (
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${(stats.read / stats.totalMessages) * 100}%` }}
                    />
                  )}
                  {stats.failed > 0 && (
                    <div
                      className="bg-red-500 h-full"
                      style={{ width: `${(stats.failed / stats.totalMessages) * 100}%` }}
                    />
                  )}
                  {stats.totalSent > 0 && (
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${(stats.totalSent / stats.totalMessages) * 100}%` }}
                    />
                  )}
                  {stats.pending > 0 && (
                    <div
                      className="bg-slate-200 h-full"
                      style={{ width: `${(stats.pending / stats.totalMessages) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Delivered
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Read
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Sent
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Failed
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-slate-200" /> Pending
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Failure Analysis Section — Only show if there are failures */}
        {stats.failed > 0 && failureAnalysis && (
          <div className="mb-8">
            <div className="p-5 rounded-xl bg-white border-2 border-red-200">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-foreground">Failure Analysis</h3>
                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs ml-2">
                  {stats.failed} failed ({failureAnalysis.failureRate}%)
                </Badge>
              </div>

              {failureAnalysis.reasons.length > 0 ? (
                <div className="space-y-3">
                  {failureAnalysis.reasons
                    .sort((a, b) => b.count - a.count)
                    .map((fr, index) => {
                      const percentage = stats.failed > 0 ? ((fr.count / stats.failed) * 100).toFixed(1) : '0'
                      const labelConfig = FAILURE_REASON_LABELS[fr.reason]

                      return (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-red-50/50 border border-red-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm font-medium text-foreground">
                                {labelConfig?.label || fr.reason}
                              </span>
                            </div>
                            {labelConfig?.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                                {labelConfig.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-700">{fr.count}</p>
                            <p className="text-xs text-muted-foreground">{percentage}%</p>
                          </div>
                          <div className="w-32 h-2 bg-red-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    {stats.failed} messages failed but no specific failure reasons were recorded.
                    Ensure your message sending logic captures provider error details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className="mb-8">
          <div className="p-5 rounded-xl bg-white border-2 border-green-950">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-foreground">Message Summary</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-3">
              {messageContent ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                    <span className="text-xs font-medium text-muted-foreground">Message Type</span>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                      {messageContent.type || (messageContent.templateId ? "TEMPLATE" : "TEXT")}
                    </Badge>
                  </div>
                  {messageContent.templateName && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                      <span className="text-xs font-medium text-muted-foreground">Template Name</span>
                      <span className="text-xs font-semibold text-foreground">{messageContent.templateName}</span>
                    </div>
                  )}
                  {messageContent.freeformMessage && (
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Message Preview</p>
                      <p className="text-xs text-foreground italic">"{messageContent.freeformMessage}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No message content available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Table */}
        <div className="mb-8">
          <div className="p-5 rounded-xl bg-white border-2 border-green-950">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-foreground">Message Log</h3>
                {pagination && (
                  <span className="text-xs text-muted-foreground">
                    ({pagination.totalMessages.toLocaleString()} total)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={statusFilter === null ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleStatusFilter(null)}
                  >
                    All
                  </Button>
                  {Object.entries(messageStatusConfig).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={statusFilter === key ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7 capitalize"
                      onClick={() => handleStatusFilter(key)}
                    >
                      {config.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden border rounded-xl border-green-950">
              <Table>
                <TableHeader className="bg-green-950">
                  <TableRow className="bg-green-950 hover:bg-green-950">
                    <TableHead className="text-xs font-semibold text-muted py-3 px-4">Recipient</TableHead>
                    <TableHead className="text-xs font-semibold text-muted py-3 px-4">Phone</TableHead>
                    <TableHead className="text-xs font-semibold text-muted py-3 px-4">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-muted py-3 px-4">Failure Details</TableHead>
                    <TableHead className="text-xs font-semibold text-muted py-3 px-4">Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {(campaign.messages || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
                            <MessageSquare className="h-7 w-7 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {statusFilter ? `No ${statusFilter} messages` : "No messages yet"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {statusFilter
                              ? "Try changing the filter or refresh the page"
                              : "Messages will appear here once the campaign starts sending"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaign.messages?.map((message) => {
                      const msgStatus = messageStatusConfig[message.status] || messageStatusConfig.pending

                      return (
                        <TableRow
                          key={message.id}
                          className={cn(
                            "hover:bg-slate-50/50 transition-colors",
                            message.status === 'failed' && "bg-red-50/30"
                          )}
                        >
                          {/* Recipient */}
                          <TableCell className="py-3.5 px-4">
                            <p className="text-sm font-medium text-foreground">
                              {message.contact
                                ? `${message.contact.firstName || ""} ${message.contact.lastName || ""}`.trim() || "Unknown"
                                : "—"
                              }
                            </p>
                          </TableCell>

                          {/* Phone */}
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-mono">
                                {message.contact?.phoneNumber || "—"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3.5 px-4">
                            <Badge className={cn("text-xs border", msgStatus.badgeClass)}>
                              {msgStatus.label}
                            </Badge>
                          </TableCell>

                          {/* Failure Details */}
                          <TableCell className="py-3.5 px-4 max-w-xs">
                            {message.status === 'failed' ? (
                              <div className="space-y-1">
                                {message.failureReason && (
                                  <FailureReasonBadge reason={message.failureReason} />
                                )}
                                {message.errorMessage && (
                                  <p className="text-[10px] text-red-500 italic break-all" title={message.errorMessage}>
                                    {message.errorMessage.length > 80
                                      ? `${message.errorMessage.slice(0, 80)}...` 
                                      : message.errorMessage
                                    }
                                  </p>
                                )}
                                {!message.failureReason && !message.errorMessage && (
                                  <span className="text-xs text-muted-foreground italic">
                                    No failure details captured — check your sending logic
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Sent At */}
                          <TableCell className="py-3.5 px-4">
                            <span className="text-xs text-foreground">
                              {message.status === 'failed'
                                ? formatDate(message.failedAt || message.createdAt)
                                : formatDate(message.sentAt || message.createdAt)
                              }
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} • {pagination.totalMessages.toLocaleString()} messages
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0 text-xs"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={!pagination.hasNextPage}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

