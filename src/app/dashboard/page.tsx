"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { StandardLayout } from "@/components/ui/standard-layout"
import { useSession } from "next-auth/react"
import { WhatsAppConnectionStatus } from "@/components/whatsapp"
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
  BarChart3,
  Activity,
  ChevronRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

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

// Default/fallback data
const defaultAnalyticsData: AnalyticsData = {
  overview: { totalContacts: 0, messagesSent: 0, activeCampaigns: 0, activeAutomations: 0 },
  performance: { deliveryRate: 0, readRate: 0, dateRange: "7d" },
  messageVolume: [],
  campaignDetails: [],
  recentActivity: [],
  trends: { messagesSent: 0, deliveryRate: 0, readRate: 0, newContacts: 0 },
  contactGrowth: { newContacts: 0, trend: 0 }
}

const fallbackMetrics = [
  { title: "Messages Sent", value: "0", change: "+0%", trend: "up" as const, icon: Send },
  { title: "Delivery Rate", value: "0%", change: "+0%", trend: "up" as const, icon: CheckCircle2 },
  { title: "Read Rate", value: "0%", change: "+0%", trend: "up" as const, icon: MessageSquare },
  { title: "New Contacts", value: "0", change: "+0%", trend: "up" as const, icon: Users },
  { title: "Active Campaigns", value: "0", change: "+0", trend: "up" as const, icon: TrendingUp },
  { title: "Active Automations", value: "0", change: "+0", trend: "up" as const, icon: Clock },
]

const fallbackMessageVolumeData = [{ name: "No data", sent: 0, delivered: 0, read: 0 }]
const fallbackCampaignPerformanceData = [{ name: "No campaigns", sent: 0, read: 0, clicked: 0 }]

const fallbackRecentActivities = [
  { id: "0", type: "info", title: "No recent activity", description: "Start a campaign to see activity here", time: "", icon: Clock },
]

const fallbackCampaignStatus = { active: 0, scheduled: 0, paused: 0, completed: 0 }

// ═══════════════════════════════════════════════════════════════
// REUSABLE STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StyledCard({
  children,
  className = "",
  title,
  description,
  titleIcon: TitleIcon,
  headerRight,
  accent = false,
  danger = false,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  titleIcon?: any;
  headerRight?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  const borderClass = danger
    ? "border-2 border-red-400"
    : accent
      ? "border-l-4 border-l-green-500 border-2 border-green-200 bg-green-50/50"
      : "border-2 border-green-950";

  return (
    <div className={`p-5 rounded-xl bg-white transition-all ${borderClass} ${className}`}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                {TitleIcon && <TitleIcon className="h-5 w-5" />}
                {title}
              </h3>
            )}
            {description && (
              <p className="text-muted-foreground text-sm mt-1">{description}</p>
            )}
          </div>
          {headerRight && <div className="flex items-center gap-2 ml-4 flex-shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: any;
}) {
  return (
    <div className="p-5 rounded-xl bg-white border-2 border-green-950 transition-all hover:shadow-md group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
          <Icon className="h-5 w-5 text-green-600" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className={`flex items-center text-xs mt-2 ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
        {trend === "up" ? (
          <ArrowUpRight className="mr-1 h-3 w-3" />
        ) : (
          <ArrowDownRight className="mr-1 h-3 w-3" />
        )}
        <span className="font-medium">{change}</span>
        <span className="ml-1 text-muted-foreground">from last period</span>
      </div>
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="p-5 rounded-xl bg-white border-2 border-green-950">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function CampaignStatusSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState("7d")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User'
  const firstName = userName.split(' ')[0]
  const organizationId = (session?.user as Record<string, unknown>)?.organizationId as string
  
  useEffect(() => {
    if (!session || !organizationId) return
    
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
        setAnalyticsData(defaultAnalyticsData)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [dateRange, session, organizationId])

  if (!session) {
    return (
      <StandardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </StandardLayout>
    )
  }
  
  if (!organizationId) {
    return (
      <StandardLayout>
        <div className="space-y-6">
          <StyledCard danger>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800">Access Denied</h4>
                <p className="text-xs text-red-700 mt-1">No organization found. Please log in again.</p>
              </div>
            </div>
          </StyledCard>
        </div>
      </StandardLayout>
    )
  }

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
      icon: Activity,
    },
  ] : fallbackMetrics

  // Process message volume data
  const messageVolumeData = analyticsData?.messageVolume && analyticsData.messageVolume.length > 0
    ? analyticsData.messageVolume.slice(-7).map((item) => {
        const date = new Date(item.date)
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
        return { name: dayName, sent: item.sent, delivered: item.delivered, read: item.read }
      })
    : fallbackMessageVolumeData

  // Process campaign performance data
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
        
        const activityDate = new Date(activity.createdAt)
        const now = new Date()
        const diffMs = now.getTime() - activityDate.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)
        
        let timeAgo = ""
        if (diffMins < 1) timeAgo = "Just now"
        else if (diffMins < 60) timeAgo = `${diffMins}m ago`
        else if (diffHours < 24) timeAgo = `${diffHours}h ago`
        else timeAgo = `${diffDays}d ago`

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

  // Calculate campaign status
  const campaignStatus = analyticsData?.campaignDetails
    ? {
        active: analyticsData.campaignDetails.filter(c => c.status === 'running').length,
        scheduled: analyticsData.campaignDetails.filter(c => c.status === 'scheduled').length,
        paused: analyticsData.campaignDetails.filter(c => c.status === 'paused').length,
        completed: analyticsData.campaignDetails.filter(c => c.status === 'completed').length,
      }
    : fallbackCampaignStatus

  const totalCampaigns = campaignStatus.active + campaignStatus.scheduled + campaignStatus.paused + campaignStatus.completed

  return (
    <StandardLayout>
      <div className="space-y-6">
      {/* Welcome Banner */}
      
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back,{" "}
              <span className="text-green-600">{firstName}</span> 👋
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Here&apos;s what&apos;s happening with your WhatsApp marketing campaigns today.
            </p>
          </div>
        </div>
      

      {/* Error Message */}
      {error && (
        <StyledCard danger>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800">Error Loading Data</h4>
              <p className="text-xs text-red-700 mt-1">{error}. Showing fallback data.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-lg border-red-300 text-red-700 hover:bg-red-50 text-xs"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </StyledCard>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <MetricCardSkeleton key={index} />)
          : metrics.map((metric, index) => <MetricCard key={index} {...metric} />)
        }
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume Chart */}
        <StyledCard
          title="Message Volume"
          description="Messages sent, delivered, and read over time"
          titleIcon={BarChart3}
          headerRight={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs">
                  {dateRange === "7d" ? "Last 7 days" : dateRange === "30d" ? "Last 30 days" : dateRange === "90d" ? "Last 90 days" : "Custom"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDateRange("7d")}>Last 7 days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange("30d")}>Last 30 days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange("90d")}>Last 90 days</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={messageVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "2px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Sent"
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Delivered"
                  />
                  <Area
                    type="monotone"
                    dataKey="read"
                    stroke="#15803d"
                    fill="#15803d"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Read"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </StyledCard>

        {/* Campaign Performance Chart */}
        <StyledCard
          title="Campaign Performance"
          description="Performance of your recent campaigns"
          titleIcon={TrendingUp}
          headerRight={
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-lg border-slate-300 text-xs"
              onClick={() => router.push("/dashboard/campaigns")}
            >
              View All
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          }
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "2px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Bar dataKey="sent" fill="#22c55e" radius={[6, 6, 0, 0]} name="Sent" />
                  <Bar dataKey="read" fill="#16a34a" radius={[6, 6, 0, 0]} name="Read" />
                  <Bar dataKey="clicked" fill="#15803d" radius={[6, 6, 0, 0]} name="Clicked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </StyledCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Recent Activity */}
        <StyledCard
          title="Recent Activity"
          description="Latest events and updates"
          titleIcon={Clock}
          headerRight={
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-lg border-slate-300 text-xs"
              onClick={() => router.push("/dashboard/inbox")}
            >
              View All
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          }
          className="lg:col-span-2"
        >
          {isLoading ? (
            <ActivitySkeleton />
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {recentActivities.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="group">
                      <div className="flex items-start gap-4 py-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${
                            activity.type === "error"
                              ? "bg-red-50"
                              : activity.type === "campaign"
                                ? "bg-green-50"
                                : activity.type === "contact"
                                  ? "bg-blue-50"
                                  : "bg-slate-50"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              activity.type === "error"
                                ? "text-red-600"
                                : activity.type === "campaign"
                                  ? "text-green-600"
                                  : activity.type === "contact"
                                    ? "text-blue-600"
                                    : "text-slate-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <p className="font-medium text-sm text-foreground">{activity.title}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{activity.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">{activity.description}</p>
                        </div>
                      </div>
                      {index < recentActivities.length - 1 && (
                        <Separator className="bg-slate-100" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </StyledCard>

        {/* Inbox Summary */}
        <StyledCard
          title="Inbox"
          description="Manage conversations and replies"
          titleIcon={MessageSquare}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Unread Messages</p>
                <p className="text-xs text-muted-foreground">Latest inbound conversations</p>
              </div>
              <Badge className="bg-slate-100 text-slate-700 border-slate-200">0</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg border-slate-300 text-xs"
              onClick={() => router.push("/dashboard/inbox")}
            >
              Open Inbox
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </StyledCard>

        {/* Campaign Status Overview */}
        <StyledCard
          title="Campaign Status"
          description="Overview of all campaigns"
          titleIcon={Calendar}
        >
          {isLoading ? (
            <CampaignStatusSkeleton />
          ) : (
            <div className="space-y-1">
              {/* Active Campaigns */}
              <div className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 group-hover:bg-green-100 transition-colors">
                    <Play className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Active</p>
                    <p className="text-xs text-muted-foreground">Currently running</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">{campaignStatus.active}</Badge>
              </div>

              <Separator className="bg-slate-100" />

              {/* Scheduled Campaigns */}
              <div className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Scheduled</p>
                    <p className="text-xs text-muted-foreground">Awaiting launch</p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">{campaignStatus.scheduled}</Badge>
              </div>

              <Separator className="bg-slate-100" />

              {/* Paused Campaigns */}
              <div className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 group-hover:bg-yellow-100 transition-colors">
                    <Pause className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Paused</p>
                    <p className="text-xs text-muted-foreground">Temporarily stopped</p>
                  </div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{campaignStatus.paused}</Badge>
              </div>

              <Separator className="bg-slate-100" />

              {/* Completed Campaigns */}
              <div className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors">
                    <CheckCircle2 className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Completed</p>
                    <p className="text-xs text-muted-foreground">Successfully finished</p>
                  </div>
                </div>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200">{campaignStatus.completed}</Badge>
              </div>

              <Separator className="bg-slate-200 my-2" />

              {/* Total */}
              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-semibold text-foreground">Total Campaigns</p>
                <p className="text-xl font-bold text-green-600">{totalCampaigns}</p>
              </div>

              {/* Quick Action */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Button 
                  onClick={() => router.push("/dashboard/campaigns/new")} 
                  className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Campaign
                </Button>
              </div>
            </div>
          )}
        </StyledCard>
      </div>
      </div>
    </StandardLayout>
  );
}