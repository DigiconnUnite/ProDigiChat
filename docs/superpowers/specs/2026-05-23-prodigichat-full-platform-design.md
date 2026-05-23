# ProDigiChat — Full Platform Implementation Design

**Date:** 2026-05-23  
**Project:** WhatsApp Marketing Tool (prodigichat.com)  
**Stack:** Next.js 16, React 19, MongoDB (Prisma), NextAuth, Meta Cloud API v25.0  
**Approach:** Three Sequential Phases

---

## Audit Summary

### What Works (Do Not Break)
- Dashboard with real analytics, charts, and API data
- Campaigns: 5-step wizard, launch/pause/resume/duplicate, message queue
- Contacts: CSV import/export, tags, lifecycle, pagination, bulk operations
- Inbox: Socket.io real-time chat, all WhatsApp message types, connection state
- Templates: Meta sync, create/edit/library, preview
- Analytics: Real API data, CSV export, WhatsApp business report tab
- Segments: Rule-based audience segmentation
- Settings: WhatsApp OAuth, team, API keys, webhooks, profile, privacy
- Auth: NextAuth, Google OAuth, email/password, RBAC

### What Is Broken / Incomplete / Mock

| Area | Severity | Root Cause |
|---|---|---|
| Blog listing page | Critical | Uses hardcoded 6-post array disconnected from `blog-data.ts`; all links 404 (numeric ID vs slug routing) |
| Blog images | High | All image paths reference files that do not exist |
| Automation page | High | 100% placeholder — "Coming Soon" banner + empty table + broken dialog |
| Dashboard inbox unread widget | Medium | Hardcoded `0`, never fetches `/api/inbox/unread-count` |
| Inbox quick action buttons | Medium | "View Full Profile", "Archive", "Mark as VIP" rendered with no onClick handlers |
| Inbox contact status | Low | Always shows "Online" regardless of real status |
| Analytics Click Rate card | Low | Hardcoded "N/A — coming soon" |
| Inbox media upload | Low | Disabled buttons with "coming soon" tooltip |
| Pricing page | Medium | No Stripe integration — "Get Started" links to `/signup` with no plan context |
| Landing stats | Low | Fabricated figures ("50K+ Active Users", "120+ Countries") |
| A/B Testing | Medium | Listed as "Coming Soon" in campaign wizard; schema exists; no implementation |

---

## Architecture (Unchanged)

- **Routing:** Next.js App Router (src/app/)
- **API:** Next.js Route Handlers (/api/*)
- **Database:** MongoDB via Prisma ORM
- **Auth:** NextAuth.js sessions, organizationId on every session
- **Queue:** `WhatsAppMessageQueue` model + cron at `/api/cron/queue`
- **Real-time:** Socket.io (websocket.ts)
- **Storage:** AWS S3 (uploads), Upstash Redis (rate limiting, distributed lock)
- **Encryption:** AES-256-GCM for WhatsApp credentials

---

## Phase 1 — Fix All Existing Pages

**Goal:** Every page that exists today must be correct, functional, and free of mock/hardcoded data.

### 1.1 Blog System Fix

**File:** `src/app/blog/page.tsx`

- Remove the inline `blogPosts` array (6 fake posts)
- Import `blogPosts, getAllCategories` from `@/lib/blog-data`
- Fix all `href` attributes from `/blog/${post.id}` → `/blog/${post.slug}`
- Add category filter tabs using `getAllCategories()`
- Replace `picsum.photos` image sources with local `/blog/[slug].jpg` paths

**File:** `src/lib/blog-data.ts`

Add 6 more posts to reach 10 total. New articles:
1. "WhatsApp Broadcast Timing: When to Send for Maximum Opens" (slug: `broadcast-timing-guide`)
2. "GDPR and WhatsApp Marketing: A Complete Compliance Guide" (slug: `gdpr-whatsapp-compliance`)
3. "Contact Segmentation Strategies That Double Response Rates" (slug: `contact-segmentation-strategies`)
4. "Writing WhatsApp Templates That Get Approved First Time" (slug: `template-approval-guide`)
5. "Abandoned Cart Recovery via WhatsApp: Step-by-Step Playbook" (slug: `abandoned-cart-whatsapp`)
6. "Re-engaging Inactive Contacts Without Getting Blocked" (slug: `re-engagement-strategies`)

Each post must have: `id`, `title`, `slug`, `excerpt` (2-3 sentences), `content` (1000+ word Markdown body), `author`, `publishedAt`, `readTime`, `category`, `tags[]`, `featured: false`, `image`

**Images:**

Create `/public/blog/` directory. For each post, create a simple SVG placeholder (`[slug].svg`) with the article category and title rendered on a green gradient background. Reference these from blog-data.ts. The SVG approach requires no external dependencies and looks professional.

Format:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:#16a34a;stop-opacity:1"/>
    <stop offset="100%" style="stop-color:#15803d;stop-opacity:1"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="100" y="280" font-family="sans-serif" font-size="48" fill="white" font-weight="bold">
    [Category]
  </text>
  <text x="100" y="360" font-family="sans-serif" font-size="32" fill="rgba(255,255,255,0.8)">
    [Short Title]
  </text>
</svg>
```

### 1.2 Dashboard Inbox Unread Widget

**File:** `src/app/dashboard/page.tsx` — Inbox Summary `StyledCard`

- Add `const [unreadCount, setUnreadCount] = useState(0)` 
- Add `useEffect` that calls `GET /api/inbox/unread-count` on mount and every 60 seconds via `setInterval`
- Display real count with a pulsing green dot if count > 0
- Replace the hardcoded `<Badge>0</Badge>` with `<Badge>{unreadCount}</Badge>`

### 1.3 Inbox Quick Action Buttons

**File:** `src/app/dashboard/inbox/page.tsx`

**"View Full Profile" button:**
```tsx
onClick={() => router.push(`/dashboard/contacts?contactId=${selectedConversation.id}`)}
```
Also update `/dashboard/contacts/page.tsx` to read the `contactId` query param and auto-open the contact detail drawer on mount.

**"Archive Conversation" button:**
- Call `PATCH /api/inbox` with body `{ contactId, action: 'archive' }`
- Add `action: 'archive'` handling in `/api/inbox/route.ts` PATCH handler
- Set `contact.lifecycleStatus = 'suppressed'` in DB (marks as archived)
- Remove from conversation list in UI state with success toast

**"Mark as VIP" button:**
- Call `PATCH /api/contacts/${selectedConversation.id}` with `{ tags: [...existingTags, 'VIP'] }`
- On success, update local conversation state and show toast
- Toggle behavior: if already tagged 'VIP', remove the tag

### 1.4 Inbox Contact Status

**File:** `src/app/dashboard/inbox/page.tsx`

The API at `/api/inbox` returns conversations. Map the `status` field:
```tsx
const statusLabel = {
  active: 'Online',
  inactive: 'Last seen recently', 
  blocked: 'Blocked',
  suppressed: 'Archived',
}[conversation.status] ?? 'Unknown'
```
Replace hardcoded "Online" text with `{statusLabel}`.

### 1.5 Analytics — Replace Click Rate with Replies Metric

**File:** `src/app/dashboard/analytics/page.tsx`

Replace the "Click Rate (N/A)" card with a "Replies Received" metric card:
- Query: count of `Message` records where `direction = 'incoming'` and `createdAt` within `dateRange`
- Add this to the `/api/analytics` response as `repliesReceived` and `repliesTrend`
- Display as a real metric: total inbound messages received across the period

**File:** `src/app/api/analytics/route.ts`

Add to the existing analytics query:
```ts
const repliesReceived = await prisma.message.count({
  where: { organizationId, direction: 'incoming', createdAt: { gte: startDate } }
})
```

### 1.6 Landing Page — Replace Fabricated Stats

**File:** `src/app/landing/page.tsx`

Replace the `stats` array with defensible, product-fact-based claims:
```ts
const stats = [
  { label: "Setup Time", value: "< 5 min" },
  { label: "WhatsApp Users Reached", value: "2.5B+" },
  { label: "Meta Verified API", value: "✓ Official" },
  { label: "Message Delivery Rate", value: "98%+" },
]
```

### 1.7 Inbox — Enable Image/Document Upload (Partial)

The disabled buttons in the inbox input area need to either:
- Be wired to a real file upload flow (upload to S3 → send WhatsApp media message), OR
- Be removed entirely until ready

**Decision:** Implement basic image upload:
1. Click image button → open file picker (accept: `image/*`)
2. Upload selected file to S3 via `/api/upload`
3. Call `/api/inbox` POST with `{ contactId, type: 'image', mediaUrl: s3Url }`
4. The inbox API sends the WhatsApp image message via the existing `messages.ts` media handler

Document upload follows the same pattern (`type: 'document'`).

---

## Phase 2 — Stripe Billing Integration

**Goal:** Full subscription management — plan selection, checkout, webhooks, enforcement, billing portal.

### 2.1 Database Schema Changes

**File:** `prisma/schema.prisma`

Add to `Team` model:
```prisma
plan              String   @default("free")   // "free" | "pro" | "enterprise"
stripeCustomerId  String?
stripeSubscriptionId String?
planExpiresAt     DateTime?
planStatus        String   @default("active") // "active" | "past_due" | "canceled"
messagesSentThisMonth Int  @default(0)
messagesSentResetAt   DateTime?
```

Add new model:
```prisma
model BillingEvent {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String   @db.ObjectId
  stripeEventId  String   @unique
  eventType      String
  payload        Json
  processedAt    DateTime @default(now())
}
```

### 2.2 Plan Limits Utility

**New file:** `src/lib/plan-limits.ts`

```ts
export const PLAN_LIMITS = {
  free:       { contacts: 100,    messagesPerMonth: 1_000,    teamMembers: 1  },
  pro:        { contacts: 10_000, messagesPerMonth: 100_000,  teamMembers: 10 },
  enterprise: { contacts: Infinity, messagesPerMonth: Infinity, teamMembers: Infinity },
} as const

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
}

export async function checkContactLimit(organizationId: string): Promise<boolean>
export async function checkMessageQuota(organizationId: string): Promise<boolean>
export async function checkTeamMemberLimit(organizationId: string): Promise<boolean>
```

### 2.3 Stripe Price IDs

Add to `.env`:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 2.4 New API Routes

**`POST /api/billing/checkout`**

Request: `{ plan: 'pro' | 'enterprise', interval: 'monthly' | 'yearly' }`

- Look up or create Stripe Customer for the org
- Create Stripe Checkout Session with the correct price ID
- `success_url`: `/dashboard?upgraded=true`
- `cancel_url`: `/pricing`
- Return: `{ url: checkoutUrl }`

**`POST /api/billing/portal`**

- Look up org's `stripeCustomerId`
- Create Stripe Customer Portal session
- Return: `{ url: portalUrl }`

**`POST /api/billing/webhook`** (no auth — verified by Stripe signature)

Handle events:
- `checkout.session.completed` → update org `plan`, `stripeCustomerId`, `stripeSubscriptionId`, `planStatus: 'active'`
- `customer.subscription.updated` → update `plan` and `planStatus`
- `customer.subscription.deleted` → set `plan: 'free'`, `planStatus: 'canceled'`
- `invoice.payment_failed` → set `planStatus: 'past_due'`, send in-app notification to org admins
- All events → write a `BillingEvent` record for audit trail

**`GET /api/billing/status`**

Return: `{ plan, planStatus, planExpiresAt, usage: { contacts, messagesThisMonth, teamMembers }, limits: getPlanLimits(plan) }`

### 2.5 Plan Enforcement

**`POST /api/contacts` route:**
- Before creating contact: `const ok = await checkContactLimit(orgId)`
- If over limit: return `{ error: 'Contact limit reached', upgrade: true }` with HTTP 402

**`POST /api/campaigns/[id]/launch` route:**
- Before enqueuing: `const ok = await checkMessageQuota(orgId)`
- If over limit: return `{ error: 'Monthly message quota reached', upgrade: true }` with HTTP 402

**Org member invites:**
- Before sending invite: `const ok = await checkTeamMemberLimit(orgId)`
- If over limit: return HTTP 402

**Monthly reset:**
- The existing cron at `/api/cron/health` or a new `/api/cron/billing-reset` resets `messagesSentThisMonth = 0` on the 1st of each month

### 2.6 Pricing Page Changes

**File:** `src/app/pricing/page.tsx`

- Add `billingInterval` state (`monthly` | `yearly`) — already has this toggle
- Replace all "Get Started" `<Link>` buttons with `<Button onClick={handleCheckout}>` that call `/api/billing/checkout`
- For the Free plan: redirect to `/signup` as before
- Show a loading spinner on the button while the checkout URL is being fetched
- If user is already logged in and on a paid plan, show "Manage Billing" button that calls `/api/billing/portal`

### 2.7 Billing Settings Tab

**File:** `src/app/dashboard/settings/page.tsx`

Add a new "Billing" tab (after Privacy). The tab component:

**File:** `src/components/settings/BillingSettingsTab.tsx`

Sections:
1. **Current Plan** — plan name badge, status badge, renewal date
2. **Usage Meters** — progress bars for Contacts / Messages / Team Members (used vs limit)
3. **Payment Method** — "Manage via Stripe" button → calls `/api/billing/portal`
4. **Upgrade CTA** — only shown for free/pro plans; links to `/pricing`

**Upgrade Banner:**

**File:** `src/components/UpgradeBanner.tsx`

Rendered in the dashboard layout when usage > 80% of any limit. Shows which resource is nearly exhausted and links to `/pricing`.

---

## Phase 3 — Automation Engine

**Goal:** A fully functional automation workflow system with a visual canvas builder and reliable backend execution.

### 3.1 Database Schema Changes

**File:** `prisma/schema.prisma`

Extend `AutomationWorkflow`:
```prisma
model AutomationWorkflow {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId  String   @db.ObjectId
  name            String
  description     String?
  triggerType     String   // "contact_created" | "inbound_message" | "campaign_completed" | "tag_added" | "scheduled" | "manual"
  triggerConfig   Json?    // e.g., { keyword: "HELP" } for inbound_message
  nodes           Json     // ReactFlow node array
  edges           Json     // ReactFlow edge array
  status          String   @default("draft") // "draft" | "active" | "paused"
  totalExecutions Int      @default(0)
  successfulExecutions Int @default(0)
  lastRunAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  team            Team     @relation(fields: [organizationId], references: [id])
  executions      AutomationExecution[]
  @@index([organizationId, status])
}
```

Add new model:
```prisma
model AutomationExecution {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  workflowId      String   @db.ObjectId
  organizationId  String   @db.ObjectId
  contactId       String?  @db.ObjectId
  triggerType     String
  triggerPayload  Json?
  status          String   @default("running") // "running" | "completed" | "failed" | "waiting"
  currentNodeId   String?
  waitUntil       DateTime?  // set when a "wait" node is active
  logs            Json[]   @default([])
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  error           String?
  workflow        AutomationWorkflow @relation(fields: [workflowId], references: [id])
  @@index([workflowId])
  @@index([status, waitUntil])
}
```

### 3.2 Node Type Definitions

**New file:** `src/types/automation.ts`

```ts
export type TriggerType = 
  | 'contact_created'
  | 'inbound_message'
  | 'campaign_completed'
  | 'tag_added'
  | 'scheduled'
  | 'manual'

export type ActionNodeType =
  | 'send_message'
  | 'wait'
  | 'add_tag'
  | 'remove_tag'
  | 'update_field'
  | 'condition'
  | 'end'

export interface TriggerNode {
  id: string
  type: 'trigger'
  data: {
    triggerType: TriggerType
    config: Record<string, unknown>  // trigger-specific config
    label: string
  }
  position: { x: number; y: number }
}

export interface ActionNode {
  id: string
  type: ActionNodeType
  data: {
    label: string
    config: Record<string, unknown>  // action-specific config
  }
  position: { x: number; y: number }
}

export type WorkflowNode = TriggerNode | ActionNode

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string  // for condition nodes: "yes" | "no"
}
```

**Node config shapes:**

| Node Type | Config Fields |
|---|---|
| `trigger: contact_created` | `{ tags?: string[] }` — only fire if contact has these tags |
| `trigger: inbound_message` | `{ keyword?: string, matchType: 'exact' \| 'contains' \| 'any' }` |
| `trigger: campaign_completed` | `{ campaignId?: string, status: 'delivered' \| 'read' }` |
| `trigger: tag_added` | `{ tag: string }` |
| `trigger: scheduled` | `{ cron: string, timezone: string }` |
| `send_message` | `{ messageType: 'template' \| 'text', templateId?: string, text?: string }` |
| `wait` | `{ duration: number, unit: 'minutes' \| 'hours' \| 'days' }` |
| `add_tag` | `{ tag: string }` |
| `remove_tag` | `{ tag: string }` |
| `update_field` | `{ field: string, value: string }` |
| `condition` | `{ field: string, operator: 'equals' \| 'contains' \| 'exists', value: string }` |
| `end` | `{}` |

### 3.3 Execution Engine

**New file:** `src/lib/automation-engine.ts`

```ts
// Trigger a workflow for a contact
export async function triggerWorkflow(
  workflowId: string,
  contactId: string,
  triggerPayload: Record<string, unknown>
): Promise<void>

// Process one step of a running execution
export async function processExecutionStep(executionId: string): Promise<void>

// Fan out: find all active workflows matching an event and trigger them
export async function triggerAutomations(
  organizationId: string,
  event: TriggerType,
  payload: { contactId?: string; [key: string]: unknown }
): Promise<void>
```

**Execution flow for `triggerWorkflow`:**
1. Create `AutomationExecution` record with `status: 'running'`, `currentNodeId` = first action node after trigger
2. Enqueue a step-processing job (add to existing queue or a new `AutomationStep` collection)
3. Return immediately (async execution)

**Execution flow for `processExecutionStep`:**
1. Load execution + workflow
2. Find `currentNodeId` in the nodes array
3. Switch on node type:
   - `send_message`: call the existing WhatsApp sending function; advance to next node
   - `wait`: set `waitUntil = now() + duration`; set `status: 'waiting'`; stop processing (cron will resume)
   - `add_tag` / `remove_tag`: update contact in DB; advance to next node
   - `update_field`: update contact field in DB; advance to next node
   - `condition`: evaluate condition against contact; follow 'yes' or 'no' edge; advance
   - `end`: set `status: 'completed'`, `completedAt = now()`; update workflow `totalExecutions`, `successfulExecutions`
4. Append a log entry: `{ nodeId, nodeType, timestamp, result }`
5. If error: set `status: 'failed'`, `error = message`

**Cron integration** (`/api/cron/queue` handler):

Add to the existing queue processor:
```ts
// Resume waiting automation executions whose waitUntil has passed
const resumeExecutions = await prisma.automationExecution.findMany({
  where: { status: 'waiting', waitUntil: { lte: new Date() } }
})
for (const exec of resumeExecutions) {
  await processExecutionStep(exec.id)
}
```

**Trigger hookup points:**

| Event | File to modify | Code to add |
|---|---|---|
| `contact_created` | `src/app/api/contacts/route.ts` POST handler | `await triggerAutomations(orgId, 'contact_created', { contactId: newContact.id })` |
| `inbound_message` | `src/lib/whatsapp-incoming-message.ts` | `await triggerAutomations(orgId, 'inbound_message', { contactId, message: content })` |
| `tag_added` | `src/app/api/contacts/[id]/route.ts` PATCH handler | Detect tag additions; call `triggerAutomations` for each new tag |
| `campaign_completed` | Queue processor when status updates to `delivered`/`read` | `await triggerAutomations(orgId, 'campaign_completed', { contactId, campaignId, status })` |
| `scheduled` | `/api/cron/queue` | Check `AutomationWorkflow` with `triggerType: 'scheduled'` and matching cron expression |

### 3.4 API Routes

**`GET /api/automation`**
- List all workflows for the org (name, status, triggerType, totalExecutions, successfulExecutions, lastRunAt)
- Support `?status=active|draft|paused` filter

**`POST /api/automation`**
- Create a new workflow in draft state
- Body: `{ name, description?, triggerType, triggerConfig? }`
- Return the created workflow with empty `nodes: []`, `edges: []`

**`GET /api/automation/[id]`**
- Return full workflow including `nodes` and `edges`

**`PUT /api/automation/[id]`**
- Update `name`, `description`, `triggerType`, `triggerConfig`, `nodes`, `edges`
- Does not activate — keep as draft until explicitly enabled

**`DELETE /api/automation/[id]`**
- Soft-delete or hard-delete; cancel any running executions

**`POST /api/automation/[id]/enable`**
- Validate: must have at least one trigger node and one action node, must have edges connecting them
- Set `status: 'active'`
- Return the updated workflow

**`POST /api/automation/[id]/disable`**
- Set `status: 'paused'`
- Do not terminate in-flight executions (let them complete)

**`POST /api/automation/[id]/test`**
- Body: `{ contactId }` — a real contact from the org to use as the test subject
- Create a test execution with `triggerPayload: { source: 'manual_test' }`
- Process synchronously (up to 5 steps) and return the execution logs
- Do NOT send real messages (set a `dryRun: true` flag that `send_message` nodes respect)

**`GET /api/automation/[id]/executions`**
- List recent executions (last 50) for this workflow
- Include: `contactId`, `status`, `startedAt`, `completedAt`, `logs`

### 3.5 Visual Canvas Builder (Frontend)

**Dependencies to add:**
```
npm install reactflow
```

**New files:**

`src/app/dashboard/automation/[id]/page.tsx` — Workflow editor page

`src/components/automation/WorkflowCanvas.tsx` — Main ReactFlow canvas component

`src/components/automation/NodeSidebar.tsx` — Draggable node palette

`src/components/automation/nodes/TriggerNode.tsx` — Custom ReactFlow node for triggers

`src/components/automation/nodes/ActionNode.tsx` — Custom ReactFlow node for actions

`src/components/automation/nodes/ConditionNode.tsx` — Custom ReactFlow node with two output handles (yes/no)

`src/components/automation/NodeConfigPanel.tsx` — Right sidebar that opens when a node is selected

**Canvas layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back]  Workflow Name (editable)    [Test] [Save] [Enable]   │  ← Header
├────────┬────────────────────────────────────────────────────────┤
│ NODE   │                                                         │
│ TYPES  │              REACT FLOW CANVAS                         │
│        │                                                         │
│ ◉ Trig │    [Trigger: Contact Created]                           │
│ ⚡ Act  │              ↓                                          │
│ ⑂ Cond │    [Action: Send Message]                               │
│        │              ↓                                          │
│        │    [Wait: 2 hours]                                      │
│        │              ↓                                          │
│        │    [Condition: Tag = VIP]                               │
│        │          yes ↓    ↓ no                                  │
│        │   [Send Msg]    [Add Tag]                               │
│        │              ↓                                          │
│        │    [End]                                                │
│        │                                                         │
└────────┴──────────────────────────────────────────────────────── ┘
                                          ↑
                                 [Node Config Panel opens here
                                  when a node is clicked]
```

**Node config panel contents by node type:**

| Node | Config UI |
|---|---|
| Trigger: contact_created | Tag filter dropdown (optional) |
| Trigger: inbound_message | Keyword input, match type radio |
| Trigger: tag_added | Tag select dropdown |
| Trigger: scheduled | Cron expression input + human-readable preview |
| send_message | Message type toggle (template/text); template selector or text area |
| wait | Duration number input + unit select (minutes/hours/days) |
| add_tag / remove_tag | Tag input with autocomplete from existing tags |
| update_field | Field select (dropdown of contact fields) + value input |
| condition | Field select + operator select + value input |
| end | No config (informational only) |

**Canvas save flow:**
1. User edits nodes/edges in the canvas
2. Click "Save" → serialize ReactFlow state to `nodes[]` + `edges[]`
3. `PUT /api/automation/[id]` with the serialized data
4. Show success toast

**Enable flow:**
1. Click "Enable" → call `POST /api/automation/[id]/enable`
2. If validation fails (no trigger, no action, no edges): show inline error on the relevant nodes
3. On success: show green "Active" badge in the header; workflow is now live

### 3.6 Updated Automation List Page

**File:** `src/app/dashboard/automation/page.tsx` (full rewrite)

Remove the "Coming Soon" card and the broken dialog. Replace with:

**Header row:** "Automation Workflows" title + "New Workflow" button
- "New Workflow" → opens a dialog to set workflow name + trigger type → creates draft → navigates to `/dashboard/automation/[id]`

**Stats row:** 4 metric cards
- Total Workflows
- Active Workflows  
- Total Executions (all time)
- Success Rate (%)

**Workflow table columns:**
- Name (clickable → `/dashboard/automation/[id]`)
- Status badge (Draft / Active / Paused)
- Trigger type chip
- Executions count
- Success rate %
- Last run time (relative: "2h ago")
- Actions menu: Edit, Duplicate, Enable/Disable, Delete

**Empty state** (when no workflows exist yet):
- Illustration + "Create your first automation" heading
- Short description of what automations can do
- "Create Workflow" button

---

## Testing Plan

### Phase 1 Tests
- Blog: navigate to /blog → all posts from blog-data.ts are listed → click each → detail page loads → no 404s
- Dashboard: inbox widget shows real count (create a test message in DB, verify count appears)
- Inbox: click "Mark as VIP" → contact gets VIP tag → verify in /dashboard/contacts
- Inbox: click "Archive" → conversation removed from list → contact status updated in DB
- Landing: verify no fabricated stat claims

### Phase 2 Tests
- Pricing: click "Pro Monthly" → redirects to Stripe checkout (test mode)
- Webhook: simulate `checkout.session.completed` event → org plan updates to "pro" in DB
- Limit enforcement: create 101 contacts on free plan → expect 402 response
- Billing tab: shows correct plan, usage meters, portal link

### Phase 3 Tests
- Create workflow: contact_created → wait 5 min → send_message → end
- Create a new contact → verify execution created in DB → wait timer fires → message queued
- Test button: run dry-run on a test contact → execution logs show steps
- Enable/disable: workflow shows correct status, no new executions created when paused
- Condition node: create a workflow with condition → verify branching works correctly

---

## Implementation Order (Within Each Phase)

### Phase 1 Order
1. Fix `blog-data.ts` (add 6 posts, add images)
2. Fix `blog/page.tsx` (use real data, fix links, add category filter)
3. Fix dashboard inbox widget (real unread count)
4. Fix inbox quick action buttons
5. Fix inbox contact status
6. Replace analytics click rate card with replies metric
7. Update analytics API to return repliesReceived
8. Fix landing stats
9. Wire inbox image/document upload

### Phase 2 Order
1. Install `stripe` npm package
2. Add Prisma schema fields + `prisma db push`
3. Create `plan-limits.ts` utility
4. Implement `/api/billing/checkout`
5. Implement `/api/billing/webhook` (most critical path)
6. Implement `/api/billing/portal`
7. Implement `/api/billing/status`
8. Add enforcement to contacts API
9. Add enforcement to campaign launch API
10. Update pricing page
11. Create `BillingSettingsTab.tsx`
12. Add Billing tab to settings page
13. Create `UpgradeBanner.tsx` and add to dashboard layout

### Phase 3 Order
1. Add Prisma schema (AutomationExecution model, extend AutomationWorkflow)
2. Create `src/types/automation.ts`
3. Install `reactflow`
4. Create `src/lib/automation-engine.ts` (core execution logic)
5. Add trigger hookup points (contacts API, webhook handler, queue processor)
6. Create all 8 API routes
7. Create `TriggerNode.tsx`, `ActionNode.tsx`, `ConditionNode.tsx` ReactFlow components
8. Create `NodeConfigPanel.tsx`
9. Create `NodeSidebar.tsx`
10. Create `WorkflowCanvas.tsx`
11. Create `/dashboard/automation/[id]/page.tsx` (editor page)
12. Rewrite `/dashboard/automation/page.tsx` (list page)
13. Add cron integration for wait nodes and scheduled triggers

---

## Dependencies to Add

| Package | Phase | Purpose |
|---|---|---|
| `stripe` | 2 | Stripe Node.js SDK |
| `reactflow` | 3 | Visual workflow canvas |

No other new dependencies required — the project already has all needed utilities.

---

## Files to Create (New)

| File | Phase |
|---|---|
| `src/lib/plan-limits.ts` | 2 |
| `src/app/api/billing/checkout/route.ts` | 2 |
| `src/app/api/billing/webhook/route.ts` | 2 |
| `src/app/api/billing/portal/route.ts` | 2 |
| `src/app/api/billing/status/route.ts` | 2 |
| `src/components/settings/BillingSettingsTab.tsx` | 2 |
| `src/components/UpgradeBanner.tsx` | 2 |
| `src/types/automation.ts` | 3 |
| `src/lib/automation-engine.ts` | 3 |
| `src/app/api/automation/[id]/enable/route.ts` | 3 |
| `src/app/api/automation/[id]/disable/route.ts` | 3 |
| `src/app/api/automation/[id]/test/route.ts` | 3 |
| `src/app/api/automation/[id]/executions/route.ts` | 3 |
| `src/app/dashboard/automation/[id]/page.tsx` | 3 |
| `src/components/automation/WorkflowCanvas.tsx` | 3 |
| `src/components/automation/NodeSidebar.tsx` | 3 |
| `src/components/automation/NodeConfigPanel.tsx` | 3 |
| `src/components/automation/nodes/TriggerNode.tsx` | 3 |
| `src/components/automation/nodes/ActionNode.tsx` | 3 |
| `src/components/automation/nodes/ConditionNode.tsx` | 3 |
| `public/blog/[slug].svg` (×10) | 1 |

---

## Files to Modify (Existing)

| File | Phase | Changes |
|---|---|---|
| `src/lib/blog-data.ts` | 1 | Add 6 new posts |
| `src/app/blog/page.tsx` | 1 | Use blog-data.ts, fix links, add category filter |
| `src/app/dashboard/page.tsx` | 1 | Real inbox unread count |
| `src/app/dashboard/inbox/page.tsx` | 1 | Wire quick action buttons, real status, image upload |
| `src/app/dashboard/analytics/page.tsx` | 1 | Replace click rate card |
| `src/app/api/analytics/route.ts` | 1 | Add repliesReceived to response |
| `src/app/api/inbox/route.ts` | 1 | Add archive action to PATCH handler |
| `src/app/landing/page.tsx` | 1 | Replace fabricated stats |
| `prisma/schema.prisma` | 2+3 | Add billing fields, AutomationExecution model |
| `src/app/pricing/page.tsx` | 2 | Wire Stripe checkout |
| `src/app/dashboard/settings/page.tsx` | 2 | Add Billing tab |
| `src/app/api/contacts/route.ts` | 2+3 | Add limit enforcement + trigger automation |
| `src/app/api/campaigns/[id]/launch/route.ts` | 2 | Add message quota check |
| `src/app/api/cron/queue/route.ts` | 3 | Add resume waiting executions |
| `src/lib/whatsapp-incoming-message.ts` | 3 | Add trigger automation on inbound |
| `src/app/dashboard/automation/page.tsx` | 3 | Full rewrite — real workflow list |
| `.env` / `.env.example` | 2 | Add Stripe env vars |
