"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "next-auth/react"
import { WhatsAppConnectionStatus } from "@/components/whatsapp"
import { DEFAULT_ORG_ID } from "@/lib/constants/settings"
import {
  MessageSquare,
  Send,
  Users,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Plus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Type definitions for Analytics API response
interface AnalyticsOverview {
  totalContacts: number
  messagesSent: number
  activeCampaigns: number
  activeAutomations: number
}

interface AnalyticsPerformance {
  deliveryRate: number
  readRate: number
  dateRange: string
}

interface MessageVolumeData {
  date: string
  sent: number
  delivered: number
  read: number
}

interface CampaignDetail {
  id: string
  name: string
  type: string
  status: string
  sent: number
  delivered: number
  read: number
  clicked: number
  failed: number
}

interface RecentActivityItem {
  id: string
  action: string
  details: Record<string, unknown>
  createdAt: string
}

interface AnalyticsTrends {
  messagesSent: number
  deliveryRate: number
  readRate: number
  newContacts: number
}

interface ContactGrowth {
  newContacts: number
  trend: number
}

interface AnalyticsData {
  overview: AnalyticsOverview
  performance: AnalyticsPerformance
  messageVolume: MessageVolumeData[]
  campaignDetails: CampaignDetail[]
  recentActivity: RecentActivityItem[]
  trends: AnalyticsTrends
  contactGrowth: ContactGrowth
}

// Default/fallback data for when API returns null
const defaultAnalyticsData: AnalyticsData = {
  overview: {
    totalContacts: 0,
    messagesSent: 0,
    activeCampaigns: 0,
    activeAutomations: 0
  },
  performance: {
    deliveryRate: 0,
    readRate: 0,
    dateRange: "7d"
  },
  messageVolume: [],
  campaignDetails: [],
  recentActivity: [],
  trends: {
    messagesSent: 0,
    deliveryRate: 0,
    readRate: 0,
    newContacts: 0
  },
  contactGrowth: {
    newContacts: 0,
    trend: 0
  }
}

// Mock data for metrics (used as fallback)
const fallbackMetrics = [
  {
    title: "Messages Sent",
    value: "0",
    change: "+0%",
    trend: "up" as const,
    icon: Send,
  },
  {
    title: "Delivery Rate",
    value: "0%",
    change: "+0%",
    trend: "up" as const,
    icon: CheckCircle2,
  },
  {
    title: "Read Rate",
    value: "0%",
    change: "+0%",
    trend: "up" as const,
    icon: MessageSquare,
  },
  {
    title: "New Contacts",
    value: "0",
    change: "+0%",
    trend: "up" as const,
    icon: Users,
  },
  {
    title: "Active Campaigns",
    value: "0",
    change: "+0",
    trend: "up" as const,
    icon: TrendingUp,
  },
  {
    title: "Pending Messages",
    value: "0",
    change: "-0",
    trend: "up" as const,
    icon: Clock,
  },
]

// Fallback message volume data
const fallbackMessageVolumeData = [
  { name: "No data", sent: 0, delivered: 0, read: 0 },
]

// Fallback campaign performance data
const fallbackCampaignPerformanceData = [
  { name: "No campaigns", sent: 0, read: 0, clicked: 0 },
]

// Fallback recent activities
const fallbackRecentActivities = [
  {
    id: "0",
    type: "info",
    title: "No recent activity",
    description: "Start a campaign to see activity here",
    time: "",
    icon: Clock,
  },
]

// Fallback campaign status
const fallbackCampaignStatus = {
  active: 0,
  scheduled: 0,
  paused: 0,
  completed: 0,
}

export default function DashboardPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState("7d")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  
  // Get user name for welcome message
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User'
  const firstName = userName.split(' ')[0]
  
  // Use session orgId or fallback to default for demo
  const organizationId = (session?.user as Record<string, unknown>)?.organizationId as string || DEFAULT_ORG_ID

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/analytics?dateRange=${dateRange}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.success && result.data) {
          setAnalyticsData(result.data)
        } else {
          throw new Error(result.error || "Failed to fetch analytics data")
        }
      } catch (err) {
        console.error("Error fetching analytics:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
        // Keep using default/fallback data
        setAnalyticsData(defaultAnalyticsData)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [dateRange])

  // Compute metrics from API data
  const metrics = analyticsData ? [
    {
      title: "Messages Sent",
      value: analyticsData.overview.messagesSent.toLocaleString(),
      change: `${analyticsData.trends.messagesSent >= 0 ? "+" : ""}${analyticsData.trends.messagesSent}%`,
      trend: analyticsData.trends.messagesSent >= 0 ? "up" as const : "down" as const,
      icon: Send,
    },
    {
      title: "Delivery Rate",
      value: `${analyticsData.performance.deliveryRate}%`,
      change: `${analyticsData.trends.deliveryRate >= 0 ? "+" : ""}${analyticsData.trends.deliveryRate}%`,
      trend: analyticsData.trends.deliveryRate >= 0 ? "up" as const : "down" as const,
      icon: CheckCircle2,
    },
    {
      title: "Read Rate",
      value: `${analyticsData.performance.readRate}%`,
      change: `${analyticsData.trends.readRate >= 0 ? "+" : ""}${analyticsData.trends.readRate}%`,
      trend: analyticsData.trends.readRate >= 0 ? "up" as const : "down" as const,
      icon: MessageSquare,
    },
    {
      title: "New Contacts",
      value: analyticsData.contactGrowth.newContacts.toLocaleString(),
      change: `${analyticsData.contactGrowth.trend >= 0 ? "+" : ""}${analyticsData.contactGrowth.trend}%`,
      trend: analyticsData.contactGrowth.trend >= 0 ? "up" as const : "down" as const,
      icon: Users,
    },
    {
      title: "Active Campaigns",
      value: analyticsData.overview.activeCampaigns.toString(),
      change: "+0",
      trend: "up" as const,
      icon: TrendingUp,
    },
    {
      title: "Active Automations",
      value: analyticsData.overview.activeAutomations.toString(),
      change: "+0",
      trend: "up" as const,
      icon: Clock,
    },
  ] : fallbackMetrics

  // Process message volume data for chart
  const messageVolumeData = analyticsData?.messageVolume && analyticsData.messageVolume.length > 0
    ? analyticsData.messageVolume.slice(-7).map((item) => {
        const date = new Date(item.date)
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
        return {
          name: dayName,
          sent: item.sent,
          delivered: item.delivered,
          read: item.read
        }
      })
    : fallbackMessageVolumeData

  // Process campaign performance data for chart
  const campaignPerformanceData = analyticsData?.campaignDetails && analyticsData.campaignDetails.length > 0
    ? analyticsData.campaignDetails.slice(0, 5).map((campaign) => ({
        name: campaign.name.length > 12 ? campaign.name.substring(0, 12) + "..." : campaign.name,
        sent: campaign.sent,
        read: campaign.read,
        clicked: campaign.clicked
      }))
    : fallbackCampaignPerformanceData

  // Process recent activity data
  const recentActivities = analyticsData?.recentActivity && analyticsData.recentActivity.length > 0
    ? analyticsData.recentActivity.map((activity) => {
        const getIconAndType = (action: string) => {
          const actionLower = action.toLowerCase()
          if (actionLower.includes('campaign') || actionLower.includes('send') || actionLower.includes('message')) {
            return { icon: Send, type: 'campaign' as const }
          } else if (actionLower.includes('automation') || actionLower.includes('workflow') || actionLower.includes('trigger')) {
            return { icon: Play, type: 'automation' as const }
          } else if (actionLower.includes('error') || actionLower.includes('fail') || actionLower.includes('rate limit')) {
            return { icon: AlertCircle, type: 'error' as const }
          } else if (actionLower.includes('contact') || actionLower.includes('import')) {
            return { icon: Users, type: 'contact' as const }
          } else if (actionLower.includes('pause') || actionLower.includes('stop')) {
            return { icon: Pause, type: 'automation' as const }
          }
          return { icon: Clock, type: 'info' as const }
        }

        const { icon: Icon, type } = getIconAndType(activity.action)
        
        // Format time ago
        const activityDate = new Date(activity.createdAt)
        const now = new Date()
        const diffMs = now.getTime() - activityDate.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)
        
        let timeAgo = ""
        if (diffMins < 1) timeAgo = "Just now"
        else if (diffMins < 60) timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
        else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        else timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

        return {
          id: activity.id,
          type,
          title: activity.action,
          description: typeof activity.details === 'object' 
            ? Object.values(activity.details).slice(0, 2).join(', ') || 'No details'
            : String(activity.details) || 'No details',
          time: timeAgo,
          icon: Icon,
        }
      })
    : fallbackRecentActivities

  // Calculate campaign status from campaign details
  const campaignStatus = analyticsData?.campaignDetails
    ? {
        active: analyticsData.campaignDetails.filter(c => c.status === 'running').length,
        scheduled: analyticsData.campaignDetails.filter(c => c.status === 'scheduled').length,
        paused: analyticsData.campaignDetails.filter(c => c.status === 'paused').length,
        completed: analyticsData.campaignDetails.filter(c => c.status === 'completed').length,
      }
    : fallbackCampaignStatus

  return (
    <div className="container mx-auto space-y-6">
      {/* Dark Welcome Banner with WhatsApp Connection Status */}
      <div className="relative overflow-hidden rounded-2xl mt-16 bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-700 border border-slate-700/50 shadow-2xl">
        {/* Content */}
        <div className="relative px-8 py-8 ">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Welcome Message */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Welcome back,{" "}
                <span className="text-green-500">{firstName}</span> 👋
              </h1>
              <p className="text-slate-400 text-lg max-w-xl">
                Here's what's happening with your WhatsApp marketing campaigns
                today.
              </p>
            </div>

            {/* WhatsApp Connection Status Badge */}
            <div className="shrink-0 w-full lg:min-w-85 lg:w-auto">
              <WhatsAppConnectionStatus
                organizationId={organizationId}
                showFullDetails={false}
                variant="banner"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                Error loading data: {error}. Showing fallback data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading
          ? // Skeleton loaders for metrics
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div
                      className={`flex items-center text-xs ${metric.trend === "up" ? "text-primary" : "text-destructive"}`}
                    >
                      {metric.trend === "up" ? (
                        <ArrowUpRight className="mr-1 h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="mr-1 h-3 w-3" />
                      )}
                      {metric.change}
                      <span className="ml-1 text-muted-foreground">
                        from last period
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Volume Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Message Volume</CardTitle>
                <CardDescription>
                  Messages sent, delivered, and read over time
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-75 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={messageVolumeData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stroke="var(--chart-3)"
                      fill="var(--chart-3)"
                      fillOpacity={0.1}
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      stroke="var(--chart-2)"
                      fill="var(--chart-2)"
                      fillOpacity={0.1}
                    />
                    <Area
                      type="monotone"
                      dataKey="read"
                      stroke="var(--chart-1)"
                      fill="var(--chart-1)"
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Performance Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>
                  Performance of your recent campaigns
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-75 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignPerformanceData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="name"
                      className="text-xs"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar
                      dataKey="sent"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="read"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="clicked"
                      fill="var(--chart-3)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest events and updates</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/inbox")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-100 space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ScrollArea className="h-100">
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id}>
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              activity.type === "error"
                                ? "bg-destructive/10"
                                : activity.type === "campaign"
                                  ? "bg-primary/10"
                                  : "bg-muted"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                activity.type === "error"
                                  ? "text-destructive"
                                  : activity.type === "campaign"
                                    ? "text-primary"
                                    : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-sm">
                                {activity.title}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {activity.time}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                        {index < recentActivities.length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Campaign Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaign Status</CardTitle>
                <CardDescription>Overview of all campaigns</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-8" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Campaigns */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Play className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Active</p>
                      <p className="text-xs text-muted-foreground">
                        Currently running
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-primary">
                    {campaignStatus.active}
                  </Badge>
                </div>

                {/* Scheduled Campaigns */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-2/10">
                      <Calendar className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Scheduled</p>
                      <p className="text-xs text-muted-foreground">
                        Awaiting launch
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{campaignStatus.scheduled}</Badge>
                </div>

                {/* Paused Campaigns */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-3/10">
                      <Pause className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Paused</p>
                      <p className="text-xs text-muted-foreground">
                        Temporarily stopped
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{campaignStatus.paused}</Badge>
                </div>

                {/* Completed Campaigns */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">
                        Successfully finished
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{campaignStatus.completed}</Badge>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm font-medium">Total Campaigns</p>
                  <p className="text-lg font-bold">
                    {campaignStatus.active +
                      campaignStatus.scheduled +
                      campaignStatus.paused +
                      campaignStatus.completed}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
