# Dashboard and Analytics Pages - Implementation Report

This report documents the current state of the Dashboard and Analytics pages and provides a comprehensive implementation guide to make them fully functional with real data from the database.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [What's Missing/Needed](#2-whats-missingneeded)
3. [Database Schema Data Available](#3-database-schema-data-available)
4. [Implementation Guide](#4-implementation-guide)

---

## 1. Current State Analysis

### 1.1 Dashboard Page (`src/app/dashboard/page.tsx`)

**Location:** [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx)

**Current Implementation:**
- Uses hardcoded mock data for all metrics, charts, and activity feeds
- Has `dateRange` state (`7d`, `30d`, `90d`) but **does not trigger data refetch** when changed
- Quick Campaign button exists but has **no onClick handler**
- Exports components for charts (AreaChart, BarChart) but uses mock data

**Mock Data Currently Used:**
```typescript
// Lines 36-79: Metrics
const metrics = [
  { title: "Messages Sent", value: "24,521", change: "+12.5%", trend: "up", icon: Send },
  { title: "Delivery Rate", value: "98.2%", change: "+2.1%", trend: "up", icon: CheckCircle2 },
  { title: "Read Rate", value: "87.5%", change: "-0.8%", trend: "down", icon: MessageSquare },
  { title: "New Contacts", value: "1,234", change: "+23.1%", trend: "up", icon: Users },
  { title: "Active Campaigns", value: "8", change: "+2", trend: "up", icon: TrendingUp },
  { title: "Pending Messages", value: "156", change: "-45", trend: "up", icon: Clock },
]

// Lines 82-90: Message Volume Chart Data
const messageVolumeData = [
  { name: "Mon", sent: 3200, delivered: 3100, read: 2800 },
  // ... more days
]

// Lines 93-99: Campaign Performance Data
const campaignPerformanceData = [
  { name: "Summer Sale", sent: 5200, read: 4600, clicked: 1200 },
  // ... more campaigns
]

// Lines 102-143: Recent Activities
const recentActivities = [
  { id: 1, type: "campaign", title: "Summer Sale campaign launched", ... },
  // ... more activities
]
```

**Issue:** No `useEffect` hooks to fetch data from APIs, all data is static.

---

### 1.2 Analytics Page (`src/app/dashboard/analytics/page.tsx`)

**Location:** [`src/app/dashboard/analytics/page.tsx`](src/app/dashboard/analytics/page.tsx)

**Current Implementation:**
- Uses hardcoded mock campaign data in a table
- Date range selector has state but **does not trigger data refetch**
- Export Report button exists but has **no onClick handler**
- Campaign type filter exists but has **no filtering logic**

**Mock Data Currently Used:**
```typescript
// Lines 16-22: Campaign Data
const campaignData = [
  { id: 1, name: "Summer Sale", type: "broadcast", status: "completed", sent: 5200, deliveryRate: 98.5, readRate: 87.2, clickRate: 23.1 },
  { id: 2, name: "Welcome Series", type: "recurring", status: "running", sent: 850, deliveryRate: 99.2, readRate: 92.5, clickRate: 31.4 },
  // ... more campaigns
]
```

**Issue:** No API calls, no dynamic data loading, no real campaign filtering.

---

### 1.3 Analytics API Route (`src/app/api/analytics/route.ts`)

**Location:** [`src/app/api/analytics/route.ts`](src/app/api/analytics/route.ts)

**Current Capabilities:**
- ✅ Returns overview stats (totalContacts, messagesSent, activeCampaigns, activeAutomations)
- ✅ Returns performance metrics (deliveryRate, readRate)
- ✅ Supports date range filtering via query parameter (`?dateRange=30d`)
- ✅ Returns campaign status counts
- ✅ Returns automation workflow stats

**Missing Capabilities:**
- ❌ No campaign-level details (individual campaign metrics)
- ❌ No message volume time series data (daily/weekly breakdowns)
- ❌ No click tracking data (Campaign model has `stats` JSON with `clicked` but not exposed)
- ❌ No activity log data for recent activity feed
- ❌ No contact growth metrics
- ❌ No trend calculations (period-over-period comparisons)

**Current API Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalContacts": 150,
      "messagesSent": 24521,
      "activeCampaigns": 3,
      "activeAutomations": 5
    },
    "performance": {
      "deliveryRate": 98.2,
      "readRate": 87.5,
      "dateRange": "30d"
    },
    "campaigns": [{ "status": "running", "_count": 3 }],
    "automations": [{ "id": "1", "name": "Welcome", "status": "active" }]
  }
}
```

---

## 2. What's Missing/Needed

### 2.1 Frontend Issues

| Issue | Dashboard | Analytics | Impact |
|-------|-----------|-----------|--------|
| No useEffect to fetch from API | ✅ | ✅ | Pages show stale mock data |
| Date range doesn't trigger refetch | ✅ | ✅ | Can't view historical data |
| Quick Campaign button has no action | ✅ | ❌ | Can't quickly create campaign |
| Export Report button has no action | ❌ | ✅ | Can't export analytics data |
| Campaign type filter doesn't work | ❌ | ✅ | Can't filter by campaign type |
| No loading states | ✅ | ✅ | Poor UX during data fetch |
| No error handling | ✅ | ✅ | App crashes on API failures |

### 2.2 Backend Issues

| Issue | Description |
|-------|-------------|
| No time series data | Cannot show daily/weekly message volume trends |
| No click tracking | Campaign `stats` JSON has `clicked` but API doesn't return it |
| No campaign details | Returns campaign counts but not individual campaign metrics |
| No activity logs | Recent activity feed has no data source |
| No trend comparisons | Cannot calculate period-over-period changes |

---

## 3. Database Schema Data Available

### 3.1 Message Model

**Location:** [`prisma/schema.prisma:224-242`](prisma/schema.prisma:224)

```prisma
model Message {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  contactId        String   @db.ObjectId
  campaignId       String?  @db.ObjectId
  direction        String   // "incoming", "outgoing"
  status           String   // "sent", "delivered", "read", "failed"
  content          String   // JSON object with text, mediaUrl
  whatsappMessageId String?
  sentBy           String?  @db.ObjectId
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

**Available Metrics:**
- Total messages by counting records
- Delivery rate: `sent` + `delivered` + `read` / total
- Read rate: `read` / `delivered`
- Failed messages: filter by `status = 'failed'`
- Time series: `GROUP BY` on `createdAt` date

---

### 3.2 Campaign Model

**Location:** [`prisma/schema.prisma:108-129`](prisma/schema.prisma:108)

```prisma
model Campaign {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  name              String
  description       String?
  type              String   // "broadcast", "recurring", "ab_test"
  status            String   @default("draft") // "draft", "scheduled", "running", "paused", "completed", "failed"
  createdBy         String?  @db.ObjectId
  audienceSegmentId String?  @db.ObjectId
  whatsappNumberId  String?
  messageContent    String
  schedule          String?
  stats             String   // JSON: { totalSent, delivered, read, failed, clicked }
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**Available Metrics:**
- Parse `stats` JSON to get: `totalSent`, `delivered`, `read`, `failed`, `clicked`
- Campaign status counts via `GROUP BY status`
- Filter by `type` for campaign type filtering

---

### 3.3 ActivityLog Model

**Location:** [`prisma/schema.prisma:245-255`](prisma/schema.prisma:245)

```prisma
model ActivityLog {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String?  @db.ObjectId
  action    String
  details   String   // JSON object with additional details
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

**Available For:**
- Recent activity feed
- Audit trail
- User action history

---

### 3.4 Contact Model

**Location:** [`prisma/schema.prisma:52-73`](prisma/schema.prisma:52)

```prisma
model Contact {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  phoneNumber   String   @unique
  firstName     String?
  lastName      String?
  email         String?
  optInStatus   String   @default("pending")
  whatsappNumberId String?
  lastContacted DateTime?
  tags          String
  attributes    String
  userId        String?  @db.ObjectId
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Available Metrics:**
- Total contacts count
- New contacts: `COUNT` where `createdAt` in date range
- Contact growth trends

---

## 4. Implementation Guide

### Step 1: Enhance Analytics API

**File:** [`src/app/api/analytics/route.ts`](src/app/api/analytics/route.ts)

**Required Changes:**

1. **Add time series data for message volume:**
```typescript
// Add to existing queries - daily message counts
const messageVolumeByDay = await db.message.groupBy({
  by: ['status', 'createdAt'],
  _count: true,
  where: {
    direction: 'outgoing',
    createdAt: { gte: startDate },
    ...messageFilter
  },
  orderBy: { createdAt: 'asc' }
})

// Process into daily aggregates
const dailyData = processDailyMessageVolume(messageVolumeByDay)
```

2. **Add campaign-level details:**
```typescript
// Get individual campaigns with parsed stats
const campaigns = await db.campaign.findMany({
  where: {
    createdAt: { gte: startDate },
    ...campaignFilter
  },
  select: {
    id: true,
    name: true,
    type: true,
    status: true,
    stats: true,
    createdAt: true
  },
  orderBy: { createdAt: 'desc' }
})

// Parse stats JSON
const campaignsWithMetrics = campaigns.map(c => ({
  ...c,
  stats: JSON.parse(c.stats || '{}')
}))
```

3. **Add activity logs for recent activity:**
```typescript
const recentActivity = await db.activityLog.findMany({
  where: {
    createdAt: { gte: startDate }
  },
  orderBy: { createdAt: 'desc' },
  take: 20
})
```

4. **Add contact growth data:**
```typescript
const contactsByDay = await db.contact.groupBy({
  by: ['createdAt'],
  _count: true,
  where: {
    createdAt: { gte: startDate },
    ...contactFilter
  }
})
```

5. **Calculate trend comparisons:**
```typescript
// Compare current period vs previous period
const previousStartDate = new Date(startDate)
const previousStartDate.setDate(previousStartDate.getDate() * 2)

const previousMessagesSent = await db.message.count({
  where: {
    direction: 'outgoing',
    createdAt: { gte: previousStartDate, lt: startDate },
    ...messageFilter
  }
})

const messageTrend = previousMessagesSent > 0 
  ? ((messagesSent - previousMessagesSent) / previousMessagesSent) * 100
  : 0
```

**Enhanced API Response:**
```typescript
return NextResponse.json({
  success: true,
  data: {
    overview: {
      totalContacts,
      messagesSent,
      activeCampaigns,
      activeAutomations,
      newContacts,
      trends: {
        messagesSent: messageTrend,
        deliveryRate: deliveryRateTrend,
        readRate: readRateTrend
      }
    },
    performance: {
      deliveryRate: parseFloat(deliveryRate),
      readRate: parseFloat(readRate),
      clickRate: parseFloat(clickRate),
      dateRange
    },
    messageVolume: dailyData,        // NEW: time series
    campaigns: campaignsWithMetrics, // NEW: campaign details
    activity: recentActivity,       // NEW: activity feed
    contactGrowth: contactsByDay     // NEW: contact trends
  }
})
```

---

### Step 2: Add Data Fetching to Dashboard Page

**File:** [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx)

**Required Changes:**

1. **Add state and effects:**
```typescript
export default function DashboardPage() {
  const [dateRange, setDateRange] = useState("7d")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [messageVolumeData, setMessageVolumeData] = useState<any[]>([])
  const [campaignPerformanceData, setCampaignPerformanceData] = useState<any[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [campaignStatus, setCampaignStatus] = useState({
    active: 0,
    scheduled: 0,
    paused: 0,
    completed: 0
  })
  
  const { data: session } = useSession()
  const organizationId = (session?.user as any)?.organizationId || DEFAULT_ORG_ID

  // Fetch data when dateRange changes
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/analytics?dateRange=${dateRange}`)
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data')
        }
        
        const { data } = result
        
        // Transform API response to UI format
        setMetrics([
          {
            title: "Messages Sent",
            value: data.overview.messagesSent?.toLocaleString() || "0",
            change: `${data.overview.trends?.messagesSent?.toFixed(1) || 0}%`,
            trend: (data.overview.trends?.messagesSent || 0) >= 0 ? "up" : "down",
            icon: Send,
          },
          {
            title: "Delivery Rate",
            value: `${data.performance.deliveryRate}%`,
            change: `${data.overview.trends?.deliveryRate?.toFixed(1) || 0}%`,
            trend: (data.overview.trends?.deliveryRate || 0) >= 0 ? "up" : "down",
            icon: CheckCircle2,
          },
          {
            title: "Read Rate",
            value: `${data.performance.readRate}%`,
            change: `${data.overview.trends?.readRate?.toFixed(1) || 0}%`,
            trend: (data.overview.trends?.readRate || 0) >= 0 ? "up" : "down",
            icon: MessageSquare,
          },
          {
            title: "New Contacts",
            value: data.overview.newContacts?.toLocaleString() || "0",
            change: "+0%",
            trend: "up",
            icon: Users,
          },
          {
            title: "Active Campaigns",
            value: data.overview.activeCampaigns?.toString() || "0",
            change: "+0",
            trend: "up",
            icon: TrendingUp,
          },
          {
            title: "Failed Messages",
            value: data.performance.failedCount?.toLocaleString() || "0",
            change: "-0%",
            trend: "up",
            icon: AlertCircle,
          },
        ])
        
        // Set message volume chart data
        setMessageVolumeData(data.messageVolume || [])
        
        // Set campaign performance data
        setCampaignPerformanceData(
          (data.campaigns || []).slice(0, 5).map((c: any) => ({
            name: c.name,
            sent: c.stats?.totalSent || 0,
            read: c.stats?.read || 0,
            clicked: c.stats?.clicked || 0
          }))
        )
        
        // Set recent activities
        setRecentActivities(
          (data.activity || []).map((a: any, idx: number) => ({
            id: idx,
            type: mapActivityType(a.action),
            title: formatActivityTitle(a),
            description: a.details,
            time: getRelativeTime(a.createdAt),
            icon: getActivityIcon(a.action)
          }))
        )
        
        // Calculate campaign status counts
        const statusCounts = { active: 0, scheduled: 0, paused: 0, completed: 0 }
        ;(data.campaigns || []).forEach((c: any) => {
          if (c.status === 'running') statusCounts.active++
          else if (c.status === 'scheduled') statusCounts.scheduled++
          else if (c.status === 'paused') statusCounts.paused++
          else if (c.status === 'completed') statusCounts.completed++
        })
        setCampaignStatus(statusCounts)
        
      } catch (err: any) {
        console.error('Dashboard fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [dateRange, session])

  // Helper functions for data transformation
  const mapActivityType = (action: string) => {
    if (action.includes('campaign')) return 'campaign'
    if (action.includes('automation')) return 'automation'
    if (action.includes('contact')) return 'contact'
    return 'error'
  }
  
  const formatActivityTitle = (activity: any) => {
    try {
      const details = JSON.parse(activity.details)
      return details.title || activity.action
    } catch {
      return activity.action
    }
  }
  
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  }
  
  const getActivityIcon = (action: string) => {
    if (action.includes('send') || action.includes('campaign')) return Send
    if (action.includes('automation')) return Play
    if (action.includes('contact')) return Users
    return AlertCircle
  }
}
```

2. **Add Quick Campaign button handler:**
```typescript
const router = useRouter()

const handleQuickCampaign = () => {
  router.push('/dashboard/campaigns/new')
}

return (
  <Button 
    className="bg-primary hover:bg-primary/90"
    onClick={handleQuickCampaign}
  >
    <Send className="mr-2 h-4 w-4" />
    Quick Campaign
  </Button>
)
```

3. **Add loading and error states:**
```typescript
if (loading) {
  return (
    <div className="container mx-auto space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}

if (error) {
  return (
    <div className="container mx-auto">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Button onClick={() => setDateRange(dateRange)}>Retry</Button>
    </div>
  )
}
```

---

### Step 3: Add Data Fetching to Analytics Page

**File:** [`src/app/dashboard/analytics/page.tsx`](src/app/dashboard/analytics/page.tsx)

**Required Changes:**

1. **Add state and effects:**
```typescript
export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d")
  const [campaignType, setCampaignType] = useState<"all" | "broadcast" | "recurring" | "ab_test">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    messagesSent: 0,
    deliveryRate: 0,
    readRate: 0,
    clickRate: 0,
    messagesTrend: 0,
    deliveryRateTrend: 0,
    readRateTrend: 0,
    clickRateTrend: 0
  })
  
  // Campaign data state
  const [campaignData, setCampaignData] = useState<any[]>([])
  
  const { data: session } = useSession()
  const organizationId = (session?.user as any)?.organizationId || DEFAULT_ORG_ID

  // Fetch data when filters change
  useEffect(() => {
    async function fetchAnalyticsData() {
      setLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams({
          dateRange,
          ...(campaignType !== 'all' && { campaignType })
        })
        
        const response = await fetch(`/api/analytics?${params}`)
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch analytics')
        }
        
        const { data } = result
        
        // Update metrics
        setMetrics({
          messagesSent: data.overview.messagesSent || 0,
          deliveryRate: data.performance.deliveryRate || 0,
          readRate: data.performance.readRate || 0,
          clickRate: data.performance.clickRate || 0,
          messagesTrend: data.overview.trends?.messagesSent || 0,
          deliveryRateTrend: data.overview.trends?.deliveryRate || 0,
          readRateTrend: data.overview.trends?.readRate || 0,
          clickRateTrend: data.overview.trends?.clickRate || 0
        })
        
        // Update campaign data with type filtering
        let campaigns = data.campaigns || []
        if (campaignType !== 'all') {
          campaigns = campaigns.filter((c: any) => c.type === campaignType)
        }
        
        setCampaignData(campaigns.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          sent: c.stats?.totalSent || 0,
          deliveryRate: c.stats?.totalSent 
            ? ((c.stats?.delivered || 0) / c.stats.totalSent * 100).toFixed(1)
            : "0",
          readRate: c.stats?.delivered 
            ? ((c.stats?.read || 0) / c.stats.delivered * 100).toFixed(1)
            : "0",
          clickRate: c.stats?.totalSent 
            ? ((c.stats?.clicked || 0) / c.stats.totalSent * 100).toFixed(1)
            : "0"
        })))
        
      } catch (err: any) {
        console.error('Analytics fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnalyticsData()
  }, [dateRange, campaignType, session])
}
```

2. **Add Export Report functionality:**
```typescript
import { useRouter } from 'next/navigation'

const router = useRouter()

const handleExportReport = async () => {
  try {
    // Fetch full data
    const params = new URLSearchParams({ dateRange, export: 'true' })
    const response = await fetch(`/api/analytics?${params}`)
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to export')
    }
    
    // Convert to CSV
    const csvData = [
      ['Campaign', 'Type', 'Status', 'Sent', 'Delivered', 'Read', 'Clicks'].join(','),
      ...result.data.campaigns.map((c: any) => [
        c.name,
        c.type,
        c.status,
        c.stats?.totalSent || 0,
        c.stats?.delivered || 0,
        c.stats?.read || 0,
        c.stats?.clicked || 0
      ].join(','))
    ].join('\n')
    
    // Download CSV
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
  } catch (err: any) {
    console.error('Export error:', err)
    alert('Failed to export report')
  }
}

return (
  <Button variant="outline" size="sm" onClick={handleExportReport}>
    <Download className="mr-2 h-4 w-4" />
    Export Report
  </Button>
)
```

3. **Update UI to use dynamic data:**
```typescript
// Key Metrics
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{metrics.messagesSent.toLocaleString()}</div>
      <div className={`flex items-center text-xs ${metrics.messagesTrend >= 0 ? 'text-primary' : 'text-destructive'} mt-1`}>
        {metrics.messagesTrend >= 0 ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
        {Math.abs(metrics.messagesTrend).toFixed(1)}%
      </div>
    </CardContent>
  </Card>
  {/* ... other metric cards */}
</div>
```

---

### Step 4: Connect Quick Campaign and Export Buttons

Both are covered in Steps 2 and 3 above. Here's a summary:

| Button | Location | Action |
|--------|----------|--------|
| Quick Campaign | Dashboard | `router.push('/dashboard/campaigns/new')` |
| Export Report | Analytics | Generate CSV and trigger download |

---

### Step 5: Add Loading States and Error Handling

**Loading State Component (Skeleton):**

```typescript
// src/components/ui/skeleton.tsx (if not exists, create it)
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}
```

**Usage in Dashboard:**
```typescript
{loading ? (
  <>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-[400px]" />
      <Skeleton className="h-[400px]" />
    </div>
  </>
) : (
  // Actual content
)}
```

**Error Boundary/Handling:**
```typescript
{error && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error Loading Data</AlertTitle>
    <AlertDescription>
      {error}
      <Button 
        variant="outline" 
        size="sm" 
        className="ml-4"
        onClick={() => fetchData()}
      >
        Retry
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## Summary of Changes Required

### API Enhancements (`src/app/api/analytics/route.ts`)
- [ ] Add time series aggregation for message volume
- [ ] Return campaign-level details with parsed stats JSON
- [ ] Include activity logs for recent activity feed
- [ ] Calculate trend comparisons (period-over-period)
- [ ] Add click rate calculation

### Dashboard Page (`src/app/dashboard/page.tsx`)
- [ ] Replace mock data with API calls via useEffect
- [ ] Refetch data when dateRange changes
- [ ] Add Quick Campaign button onClick handler
- [ ] Add loading skeleton states
- [ ] Add error handling with retry
- [ ] Transform API response to UI format

### Analytics Page (`src/app/dashboard/analytics/page.tsx`)
- [ ] Replace mock data with API calls via useEffect
- [ ] Add campaign type filtering
- [ ] Add Export Report CSV generation and download
- [ ] Add loading skeleton states
- [ ] Add error handling with retry

### New Components
- [ ] Create `Skeleton` component if needed
- [ ] Consider creating custom hooks for data fetching (`useAnalytics`, `useDashboard`)

---

## Testing Checklist

After implementation, verify:
- [ ] Dashboard loads with real data from database
- [ ] Analytics page shows actual campaign metrics
- [ ] Date range selector triggers data refetch on both pages
- [ ] Campaign type filter works on Analytics page
- [ ] Quick Campaign button navigates to campaign creation
- [ ] Export Report downloads CSV file with correct data
- [ ] Loading states appear during data fetching
- [ ] Error states display and allow retry
- [ ] All metrics calculate correctly (delivery rate, read rate, click rate)
