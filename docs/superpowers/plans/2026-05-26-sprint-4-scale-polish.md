# Sprint 4: Scale & Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the platform scale-ready and feel like a world-class SaaS product — background message queue for campaign sends, inbox search + conversation assignment, analytics funnel view + CSV export, dark mode toggle, Cmd+K command palette, WebSocket reconnection, and mobile responsive fixes.

**Architecture:** Campaign sends move to a BullMQ queue (Redis-backed) with a worker that processes messages in batches. The command palette uses cmdk library. Dark mode uses the existing ThemeProvider toggled via a header button. WebSocket reconnection is handled by socket.io's built-in reconnection with an exponential backoff config.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, BullMQ + ioredis, cmdk (already in shadcn), Recharts, socket.io-client

---

## File Map

| Action | File |
|--------|------|
| Create | `src/lib/queue.ts` |
| Create | `src/workers/campaign-sender.ts` |
| Create | `src/app/api/queue/campaign/route.ts` |
| Create | `src/components/command-palette.tsx` |
| Create | `src/components/theme-toggle.tsx` |
| Modify | `src/app/api/campaigns/[id]/launch/route.ts` |
| Modify | `src/app/dashboard/inbox/page.tsx` |
| Modify | `src/app/dashboard/analytics/page.tsx` |
| Modify | `src/components/header.tsx` |

---

## Task 1: BullMQ queue setup

**Files:**
- Create: `src/lib/queue.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install bullmq ioredis
```

Expected: `added 2 packages`

- [ ] **Step 2: Add Redis connection env var**

Add to `.env.local`:
```
REDIS_URL=redis://localhost:6379
```

For production use Redis Cloud / Upstash.

- [ ] **Step 3: Create the queue library**

```ts
// src/lib/queue.ts
import { Queue, Worker, Job } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

export const campaignQueue = new Queue("campaign-sends", { connection })

export interface CampaignSendJob {
  campaignId: string
  organizationId: string
  batchIndex: number
  contactIds: string[]
}

export async function enqueueCampaign(
  campaignId: string,
  organizationId: string,
  contactIds: string[]
) {
  const BATCH_SIZE = 100
  const batches = []
  for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
    batches.push(contactIds.slice(i, i + BATCH_SIZE))
  }

  for (let i = 0; i < batches.length; i++) {
    await campaignQueue.add(
      "send-batch",
      { campaignId, organizationId, batchIndex: i, contactIds: batches[i] } satisfies CampaignSendJob,
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        // Throttle: delay each batch by 2 seconds to respect Meta rate limits
        delay: i * 2000,
      }
    )
  }

  return batches.length
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/queue.ts
git commit -m "feat: add BullMQ campaign send queue"
```

---

## Task 2: Campaign sender worker

**Files:**
- Create: `src/workers/campaign-sender.ts`

- [ ] **Step 1: Create the worker**

```ts
// src/workers/campaign-sender.ts
import { Worker, Job } from "bullmq"
import IORedis from "ioredis"
import { prisma } from "@/lib/prisma"
import { CampaignSendJob } from "@/lib/queue"

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

const worker = new Worker<CampaignSendJob>(
  "campaign-sends",
  async (job: Job<CampaignSendJob>) => {
    const { campaignId, organizationId, contactIds } = job.data

    // Fetch campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId },
      select: { id: true, status: true, phoneNumberId: true, message: true, templateId: true },
    })

    if (!campaign || campaign.status === "paused") {
      return { skipped: true, reason: campaign ? "paused" : "not found" }
    }

    // Fetch contacts
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, organizationId, optInStatus: "opted_in" },
      select: { id: true, phoneNumber: true, firstName: true, lastName: true },
    })

    // Send via WhatsApp API (adapt to your existing whatsapp client)
    const results = await Promise.allSettled(
      contacts.map(async (contact) => {
        // Use your existing WhatsApp send function here
        // e.g. await sendWhatsAppMessage({ to: contact.phoneNumber, message: campaign.message })
        
        // Record the message in DB
        await prisma.message.create({
          data: {
            campaignId,
            contactId: contact.id,
            organizationId,
            direction: "outbound",
            content: campaign.message ?? "",
            status: "sent",
          },
        })
      })
    )

    const successCount = results.filter(r => r.status === "fulfilled").length
    const failCount = results.filter(r => r.status === "rejected").length

    // Update campaign stats
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        stats: JSON.stringify({
          sent: successCount,
          failed: failCount,
        }),
      },
    })

    return { sent: successCount, failed: failCount }
  },
  { connection, concurrency: 5 }
)

worker.on("completed", (job, result) => {
  console.log(`Campaign batch ${job.id} completed:`, result)
})

worker.on("failed", (job, err) => {
  console.error(`Campaign batch ${job?.id} failed:`, err)
})

export { worker }
```

- [ ] **Step 2: Add worker startup to next.config**

In `next.config.js` or `next.config.ts`, the worker should run as a separate process in production. For development, add to `package.json`:

```json
"scripts": {
  "worker": "tsx src/workers/campaign-sender.ts",
  "dev:full": "concurrently \"next dev\" \"npm run worker\""
}
```

Install concurrently:
```bash
npm install --save-dev concurrently tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/workers/campaign-sender.ts
git commit -m "feat: add campaign sender BullMQ worker with batch processing"
```

---

## Task 3: Update campaign launch to use queue

**Files:**
- Modify: `src/app/api/campaigns/[id]/launch/route.ts`

- [ ] **Step 1: Read the existing launch route fully**

Read `src/app/api/campaigns/[id]/launch/route.ts`.

- [ ] **Step 2: Replace synchronous send with queue enqueue**

Find where the campaign actually sends messages (likely a loop or Promise.all). Replace with:

```ts
import { enqueueCampaign } from "@/lib/queue"

// After fetching the contact list (contactIds: string[]):
const batchCount = await enqueueCampaign(campaignId, organizationId, contactIds)

// Update campaign status to "running" (not "completed" — worker will handle completion)
await prisma.campaign.update({
  where: { id: campaignId },
  data: { status: "running" },
})

return NextResponse.json({
  success: true,
  message: `Campaign queued. Sending to ${contactIds.length} contacts in ${batchCount} batches.`,
})
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/campaigns/[id]/launch/route.ts
git commit -m "feat: campaign launch now enqueues to BullMQ instead of sending synchronously"
```

---

## Task 4: Inbox — search + unread filter + conversation assignment

**Files:**
- Modify: `src/app/dashboard/inbox/page.tsx`

- [ ] **Step 1: Read the inbox page**

Read `src/app/dashboard/inbox/page.tsx`. Find the conversation list panel and the state declarations.

- [ ] **Step 2: Add search and filter state**

Find the state declarations block. Add:

```tsx
const [inboxSearch, setInboxSearch] = useState("")
const [inboxFilter, setInboxFilter] = useState<"all" | "unread">("all")
```

- [ ] **Step 3: Add search input above the conversation list**

Find the conversation list panel JSX. At the top of the list, add:

```tsx
<div className="p-3 border-b border-slate-200 space-y-2">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search conversations…"
      value={inboxSearch}
      onChange={e => setInboxSearch(e.target.value)}
      className="pl-9 rounded-lg h-9 text-sm"
    />
  </div>
  <div className="flex gap-1">
    {(["all", "unread"] as const).map(f => (
      <button
        key={f}
        onClick={() => setInboxFilter(f)}
        className={`text-xs px-3 py-1 rounded-full capitalize transition-colors ${
          inboxFilter === f
            ? "bg-green-600 text-white"
            : "text-muted-foreground hover:bg-slate-100"
        }`}
      >
        {f}
      </button>
    ))}
  </div>
</div>
```

Add `import { Search } from "lucide-react"` if not present.

- [ ] **Step 4: Filter conversations**

Find where the conversation list renders (the `.map()` over conversations). Before the map, add filtering:

```tsx
const filteredConversations = conversations
  .filter(c => {
    if (inboxFilter === "unread" && !c.unread) return false
    if (inboxSearch) {
      const q = inboxSearch.toLowerCase()
      return (
        c.contactName?.toLowerCase().includes(q) ||
        c.phoneNumber?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      )
    }
    return true
  })
```

Use `filteredConversations` in the `.map()` instead of `conversations`.

- [ ] **Step 5: Add empty state when no conversations match**

After the `.map()`, if `filteredConversations.length === 0`:

```tsx
{filteredConversations.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
    <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
    <p className="text-sm font-medium text-foreground">
      {inboxSearch ? "No conversations match" : "No unread conversations"}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {inboxSearch ? "Try a different search." : "You're all caught up!"}
    </p>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/inbox/page.tsx
git commit -m "feat: add conversation search and unread filter to inbox"
```

---

## Task 5: WebSocket reconnection with exponential backoff

**Files:**
- Modify: `src/app/dashboard/inbox/page.tsx`

- [ ] **Step 1: Find the socket.io connection setup**

Find where `io(...)` is called to create the socket. It likely looks like:
```tsx
const socket = io("/", { ... })
```

- [ ] **Step 2: Add reconnection configuration**

Update the io() call options:

```tsx
const socket = io("/", {
  // ... existing options
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,
})
```

- [ ] **Step 3: Add reconnecting state**

Add state:
```tsx
const [socketStatus, setSocketStatus] = useState<"connected" | "disconnected" | "reconnecting">("connected")
```

Wire up events:
```tsx
socket.on("connect", () => setSocketStatus("connected"))
socket.on("disconnect", () => setSocketStatus("disconnected"))
socket.on("reconnecting", () => setSocketStatus("reconnecting"))
socket.on("reconnect", () => setSocketStatus("connected"))
socket.on("reconnect_failed", () => setSocketStatus("disconnected"))
```

- [ ] **Step 4: Update the connection banner to reflect reconnecting state**

Find the existing connection banner (added in Sprint 1). Update it:

```tsx
{socketStatus !== "connected" && (
  <div className={`flex items-center gap-2 px-4 py-2 border-b text-xs ${
    socketStatus === "reconnecting"
      ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : "bg-red-50 border-red-200 text-red-800"
  }`}>
    <div className={`h-2 w-2 rounded-full ${
      socketStatus === "reconnecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
    }`} />
    {socketStatus === "reconnecting"
      ? "Reconnecting…"
      : "Connection lost. Check your internet connection."
    }
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/inbox/page.tsx
git commit -m "fix: add WebSocket reconnection with exponential backoff and status indicator"
```

---

## Task 6: Analytics — funnel view + CSV export

**Files:**
- Modify: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Read the analytics page**

Read `src/app/dashboard/analytics/page.tsx` and find where campaign performance is rendered.

- [ ] **Step 2: Add funnel chart using Recharts**

Below the existing charts, add a "Campaign Funnel" section:

```tsx
import { FunnelChart, Funnel, LabelList, Cell, Tooltip as RechartTooltip } from "recharts"
```

Note: Recharts `FunnelChart` may not be available in all versions. Use a custom vertical bar instead:

```tsx
function FunnelBar({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg transition-all duration-500 flex items-center pl-3"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color,
              }}
            >
              {item.value > 0 && (
                <span className="text-white text-xs font-medium">
                  {i > 0 ? `${Math.round((item.value / data[0].value) * 100)}%` : "100%"}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

Then in the analytics JSX, add a funnel section using the campaign totals:

```tsx
{analyticsData && analyticsData.campaignDetails.length > 0 && (
  <div className="p-5 rounded-xl bg-white border-2 border-green-950">
    <h3 className="text-lg font-semibold mb-2">Message Funnel</h3>
    <p className="text-sm text-muted-foreground mb-6">How messages progress from sent to read</p>
    <FunnelBar
      data={[
        {
          label: "Sent",
          value: analyticsData.campaignDetails.reduce((sum, c) => sum + (c.sent ?? 0), 0),
          color: "#22c55e",
        },
        {
          label: "Delivered",
          value: analyticsData.campaignDetails.reduce((sum, c) => sum + (c.delivered ?? 0), 0),
          color: "#16a34a",
        },
        {
          label: "Read",
          value: analyticsData.campaignDetails.reduce((sum, c) => sum + (c.read ?? 0), 0),
          color: "#15803d",
        },
        {
          label: "Replied",
          value: analyticsData.campaignDetails.reduce((sum, c) => sum + (c.replied ?? 0), 0),
          color: "#166534",
        },
      ]}
    />
  </div>
)}
```

- [ ] **Step 3: Add CSV export button**

In the analytics page header area, add:

```tsx
const handleExportCSV = () => {
  if (!analyticsData?.campaignDetails) return
  const rows = [
    ["Campaign", "Type", "Status", "Sent", "Delivered", "Read", "Clicked", "Failed"],
    ...analyticsData.campaignDetails.map(c => [
      c.name, c.type, c.status,
      c.sent ?? 0, c.delivered ?? 0, c.read ?? 0, c.clicked ?? 0, c.failed ?? 0,
    ]),
  ]
  const csv = rows.map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

Add button next to the date range selector:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleExportCSV}
  disabled={!analyticsData || analyticsData.campaignDetails.length === 0}
  className="rounded-lg border-slate-300 text-xs gap-1"
>
  <Download className="h-3 w-3" />
  Export CSV
</Button>
```

Add `import { Download } from "lucide-react"`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/analytics/page.tsx
git commit -m "feat: add message funnel view and CSV export to analytics"
```

---

## Task 7: Dark mode toggle in header

**Files:**
- Create: `src/components/theme-toggle.tsx`
- Modify: `src/components/header.tsx`

- [ ] **Step 1: Create the toggle component**

```tsx
// src/components/theme-toggle.tsx
"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-lg"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

- [ ] **Step 2: Add to header**

Read `src/components/header.tsx`. Find the right side of the header (where the notification bell and user menu are). Add `<ThemeToggle />` before the notification bell:

```tsx
import { ThemeToggle } from "@/components/theme-toggle"

// In header JSX, before the notification bell:
<ThemeToggle />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/theme-toggle.tsx src/components/header.tsx
git commit -m "feat: add dark mode toggle to header"
```

---

## Task 8: Cmd+K command palette

**Files:**
- Create: `src/components/command-palette.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/components/header.tsx`

The `cmdk` library is already part of shadcn/ui (it's what `<Command>` components use).

- [ ] **Step 1: Create the command palette**

```tsx
// src/components/command-palette.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard, Send, Users, MessageSquare, BarChart3,
  Settings, Zap, Tag, UserX, FileText, Plus, Search,
} from "lucide-react"

const PAGES = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Campaigns", icon: Send, href: "/dashboard/campaigns" },
  { label: "Contacts", icon: Users, href: "/dashboard/contacts" },
  { label: "Templates", icon: FileText, href: "/dashboard/templates" },
  { label: "Inbox", icon: MessageSquare, href: "/dashboard/inbox" },
  { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { label: "Automation", icon: Zap, href: "/dashboard/automation" },
  { label: "Segments", icon: Users, href: "/dashboard/segments" },
  { label: "Tags", icon: Tag, href: "/dashboard/tags" },
  { label: "Opt-Outs", icon: UserX, href: "/dashboard/optouts" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
]

const ACTIONS = [
  { label: "Create Campaign", icon: Plus, href: "/dashboard/campaigns/new" },
  { label: "Create Template", icon: Plus, href: "/dashboard/templates/create" },
  { label: "Add Contact", icon: Plus, action: "add-contact" },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        // Don't intercept "/" inside input/textarea
        if (e.key === "/" && (e.target as HTMLElement)?.tagName === "INPUT") return
        if (e.key === "/" && (e.target as HTMLElement)?.tagName === "TEXTAREA") return
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-200 text-sm text-muted-foreground hover:bg-slate-50 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search…</span>
        <kbd className="ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigate">
            {PAGES.map(page => (
              <CommandItem
                key={page.href}
                value={page.label}
                onSelect={() => navigate(page.href)}
                className="gap-2"
              >
                <page.icon className="h-4 w-4 text-muted-foreground" />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            {ACTIONS.filter(a => a.href).map(action => (
              <CommandItem
                key={action.label}
                value={action.label}
                onSelect={() => action.href && navigate(action.href)}
                className="gap-2"
              >
                <action.icon className="h-4 w-4 text-green-600" />
                {action.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

- [ ] **Step 2: Add to header**

In `src/components/header.tsx`, add before the notification bell area:

```tsx
import { CommandPalette } from "@/components/command-palette"

// In header JSX:
<CommandPalette />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/command-palette.tsx src/components/header.tsx
git commit -m "feat: add Cmd+K command palette for quick navigation"
```

---

## Task 9: Mobile responsive fixes

**Files:**
- Modify: `src/app/dashboard/inbox/page.tsx`
- Modify: `src/app/dashboard/campaigns/page.tsx`

- [ ] **Step 1: Inbox — collapse to single panel on mobile**

Read the inbox page JSX structure. It uses a 3-column grid (`grid-cols-3` or similar). On mobile, only one panel should show at a time.

Find the main grid wrapper. Add a state for which panel is visible:

```tsx
const [mobilePanel, setMobilePanel] = useState<"list" | "chat" | "details">("list")
```

Update the grid class:
```tsx
<div className="grid md:grid-cols-[300px_1fr_280px] h-[calc(100vh-4rem)]">
```

Wrap each panel with mobile visibility:
```tsx
{/* Conversation list */}
<div className={`border-r border-slate-200 flex flex-col ${mobilePanel === "list" ? "flex" : "hidden md:flex"}`}>
  {/* ... existing list content ... */}
</div>

{/* Chat window */}
<div className={`flex flex-col ${mobilePanel === "chat" ? "flex" : "hidden md:flex"}`}>
  {/* Mobile back button */}
  <button className="md:hidden flex items-center gap-1 p-3 text-sm text-muted-foreground" onClick={() => setMobilePanel("list")}>
    ← Back
  </button>
  {/* ... existing chat content ... */}
</div>

{/* Details sidebar */}
<div className={`border-l border-slate-200 flex flex-col ${mobilePanel === "details" ? "flex" : "hidden md:flex"}`}>
  {/* ... existing details ... */}
</div>
```

When user clicks a conversation, set `setMobilePanel("chat")`.

- [ ] **Step 2: Campaigns table — hide low-priority columns on mobile**

In `src/app/dashboard/campaigns/page.tsx`, find the `<TableHead>` and `<TableCell>` for columns that are less critical on mobile (e.g., "Audience", "Delivery %" columns).

Add responsive classes:
```tsx
<TableHead className="hidden md:table-cell">Audience</TableHead>
<TableHead className="hidden lg:table-cell">Scheduled</TableHead>

// ... in TableBody rows:
<TableCell className="hidden md:table-cell">{campaign.audienceSize}</TableCell>
<TableCell className="hidden lg:table-cell">{campaign.scheduledAt}</TableCell>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/inbox/page.tsx src/app/dashboard/campaigns/page.tsx
git commit -m "fix: mobile responsive improvements for inbox and campaigns table"
```

---

## Task 10: Notification bell — real unread count

**Files:**
- Modify: `src/components/notifications/notification-dropdown.tsx`

- [ ] **Step 1: Read the notification dropdown**

Read `src/components/notifications/notification-dropdown.tsx` fully.

- [ ] **Step 2: Add real unread count fetch**

Find where the unread count is displayed. Replace any static/hardcoded `0` with a live fetch:

```tsx
const [unreadCount, setUnreadCount] = useState(0)

useEffect(() => {
  const fetchCount = () => {
    fetch("/api/notifications/unread-count")
      .then(r => r.json())
      .then(data => { if (data.count !== undefined) setUnreadCount(data.count) })
      .catch(() => {})
  }
  fetchCount()
  // Poll every 60 seconds
  const interval = setInterval(fetchCount, 60000)
  return () => clearInterval(interval)
}, [])
```

Also update the dashboard inbox summary card hardcoded `0` badge to use this count.

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/notification-dropdown.tsx
git commit -m "fix: notification bell shows real unread count with 60s polling"
```

---

## Task 11: Campaign message log — export button

**Files:**
- Modify: `src/app/dashboard/campaigns/[id]/page.tsx`

- [ ] **Step 1: Read the campaign detail page**

Read `src/app/dashboard/campaigns/[id]/page.tsx` and find the message log table section.

- [ ] **Step 2: Add export function**

Find where the messages array lives (likely `messages` state). Add:

```tsx
const handleExportLog = () => {
  if (!messages || messages.length === 0) return
  const rows = [
    ["Phone", "Status", "Sent At", "Delivered At", "Read At", "Error"],
    ...messages.map(m => [
      m.contact?.phoneNumber ?? "",
      m.status,
      m.sentAt ? new Date(m.sentAt).toISOString() : "",
      m.deliveredAt ? new Date(m.deliveredAt).toISOString() : "",
      m.readAt ? new Date(m.readAt).toISOString() : "",
      m.errorMessage ?? "",
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `campaign-${campaignId}-message-log.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Add export button to the message log header**

Find the "Message Log" section header. Add a button beside it:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleExportLog}
  disabled={!messages || messages.length === 0}
  className="rounded-lg gap-1 text-xs"
>
  <Download className="h-3 w-3" />
  Export log
</Button>
```

Add `import { Download } from "lucide-react"` if not present.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/campaigns/[id]/page.tsx
git commit -m "feat: add CSV export for campaign message log"
```

---

## Task 12: Settings — add profile photo upload

**Files:**
- Modify: `src/components/settings/ProfileSettingsTab.tsx`

- [ ] **Step 1: Read the profile settings tab**

Read `src/components/settings/ProfileSettingsTab.tsx` fully.

- [ ] **Step 2: Add avatar upload UI**

Find where the user's name/email is displayed. Add an avatar section:

```tsx
const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
const fileInputRef = useRef<HTMLInputElement>(null)

const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    toast.error("Image must be smaller than 2MB")
    return
  }
  const url = URL.createObjectURL(file)
  setAvatarPreview(url)
  // TODO: upload to /api/upload and save URL
}
```

Add the avatar UI:
```tsx
<div className="flex items-center gap-4">
  <div
    className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-green-200 hover:border-green-400 transition-colors"
    onClick={() => fileInputRef.current?.click()}
  >
    {avatarPreview ? (
      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
    ) : (
      <span className="text-2xl font-bold text-green-700">
        {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
      </span>
    )}
  </div>
  <div>
    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-lg text-xs">
      Change photo
    </Button>
    <p className="text-xs text-muted-foreground mt-1">JPG or PNG, max 2MB</p>
  </div>
  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarChange} />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/ProfileSettingsTab.tsx
git commit -m "feat: add profile photo upload UI to profile settings"
```

---

## Self-Review Checklist

- [x] BullMQ queue: campaign sends batched in 100-contact chunks with rate-limit delays
- [x] Worker: processes batches, retries on failure, updates campaign stats
- [x] Campaign launch: enqueues to queue instead of sending synchronously
- [x] Inbox search: filters conversations by name, phone, last message
- [x] Inbox unread filter: shows only unread conversations
- [x] Inbox mobile: single-panel view with back navigation
- [x] WebSocket: reconnection config with exponential backoff + status indicator
- [x] Analytics: message funnel bar chart (sent→delivered→read→replied)
- [x] Analytics: CSV export of campaign performance data
- [x] Dark mode: toggle in header using next-themes
- [x] Command palette: Cmd+K opens, navigates to all pages and quick actions
- [x] Campaigns table: hides low-priority columns on mobile
- [x] Campaign message log: CSV export button
- [x] Notification bell: real unread count with polling
- [x] Profile settings: avatar upload UI
