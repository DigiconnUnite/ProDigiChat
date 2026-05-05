"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, CheckCircle2, Clock, AlertCircle, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

interface CampaignMessage {
  id: string
  status: string
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
  messageContent: string
  audience?: {
    _count?: {
      members: number
    }
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

const statusConfig = {
  draft: { icon: Clock, label: "Draft", color: "text-gray-600", bg: "bg-gray-50" },
  scheduled: { icon: Calendar, label: "Scheduled", color: "text-blue-600", bg: "bg-blue-50" },
  running: { icon: Play, label: "Running", color: "text-green-600", bg: "bg-green-50" },
  paused: { icon: Pause, label: "Paused", color: "text-yellow-600", bg: "bg-yellow-50" },
  completed: { icon: CheckCircle2, label: "Completed", color: "text-gray-600", bg: "bg-gray-50" },
  failed: { icon: AlertCircle, label: "Failed", color: "text-red-600", bg: "bg-red-50" },
} as const

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export default function CampaignReportPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const campaignId = params?.id

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)

  useEffect(() => {
    if (!campaignId) return

    const fetchCampaign = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`)
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
      }
    }

    fetchCampaign()
  }, [campaignId])

  const stats = useMemo<CampaignStats>(() => {
    if (!campaign?.stats) return { totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 }
    try {
      return JSON.parse(campaign.stats)
    } catch {
      return { totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 }
    }
  }, [campaign?.stats])

  const schedule = useMemo<CampaignSchedule | null>(() => {
    if (!campaign?.schedule) return null
    try {
      return JSON.parse(campaign.schedule)
    } catch {
      return null
    }
  }, [campaign?.schedule])

  const messageContent = useMemo(() => {
    if (!campaign?.messageContent) return null
    try {
      return JSON.parse(campaign.messageContent)
    } catch {
      return null
    }
  }, [campaign?.messageContent])

  const status = campaign ? statusConfig[campaign.status as keyof typeof statusConfig] : null
  const StatusIcon = status?.icon

  if (isLoading) {
    return (
      <div className="bg-transparent px-2.5 border h-full lg:px-0">
        <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/campaigns")}
              className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="py-10 text-center text-gray-500">Loading report...</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="bg-transparent px-2.5 border h-full lg:px-0">
        <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/campaigns")}
              className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="py-10 text-center text-red-600">
              {error || "Campaign not found"}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const deliveryRate = stats.totalSent > 0 ? (stats.delivered / stats.totalSent) * 100 : 0
  const readRate = stats.totalSent > 0 ? (stats.read / stats.totalSent) * 100 : 0
  const clickRate = stats.totalSent > 0 ? (stats.clicked / stats.totalSent) * 100 : 0

  return (
    <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/campaigns")}
              className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <p className="text-gray-500">Campaign report</p>
            </div>
          </div>
          {status && StatusIcon && (
            <Badge variant="outline" className={`${status.bg} ${status.color} border-transparent flex items-center gap-2`}
            >
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{campaign.type.replace("_", " ")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Audience</span><span>{campaign.audience?._count?.members?.toLocaleString() || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{formatDate(campaign.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Scheduled</span><span>{schedule?.scheduledAt ? formatDate(schedule.scheduledAt) : (schedule?.sendNow ? "Send Now" : "Not scheduled")}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Total Sent</p>
                <p className="text-lg font-semibold">{stats.totalSent}</p>
              </div>
              <div>
                <p className="text-gray-500">Delivered</p>
                <p className="text-lg font-semibold">{stats.delivered}</p>
              </div>
              <div>
                <p className="text-gray-500">Read</p>
                <p className="text-lg font-semibold">{stats.read}</p>
              </div>
              <div>
                <p className="text-gray-500">Failed</p>
                <p className="text-lg font-semibold">{stats.failed}</p>
              </div>
              <div>
                <p className="text-gray-500">Delivery Rate</p>
                <p className="text-lg font-semibold">{deliveryRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-500">Read Rate</p>
                <p className="text-lg font-semibold">{readRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-500">Click Rate</p>
                <p className="text-lg font-semibold">{clickRate.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Message Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            {messageContent ? (
              <>
                <div><span className="text-gray-500">Type:</span> {messageContent.type || (messageContent.templateId ? "template" : "text")}</div>
                {messageContent.templateName && (
                  <div><span className="text-gray-500">Template:</span> {messageContent.templateName}</div>
                )}
                {messageContent.freeformMessage && (
                  <div><span className="text-gray-500">Preview:</span> {messageContent.freeformMessage}</div>
                )}
              </>
            ) : (
              <div>No message content available.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaign.messages || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No recent messages
                    </TableCell>
                  </TableRow>
                ) : (
                  campaign.messages?.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        {message.contact
                          ? `${message.contact.firstName || ""} ${message.contact.lastName || ""}`.trim() || message.contact.phoneNumber
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="capitalize">{message.status}</TableCell>
                      <TableCell>{formatDate(message.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
