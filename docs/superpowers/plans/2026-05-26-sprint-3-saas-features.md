# Sprint 3: Make it a SaaS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the platform from a free-for-all demo into a real SaaS product — enforce plan quotas, meter usage, show trial expiry banners, gate features on plan tier, and enable invoice PDF download and GDPR data export.

**Architecture:** Quota enforcement is a middleware layer that checks usage counts against plan limits before allowing API mutations. The billing page connects to Stripe Checkout for plan upgrades. Usage counts are stored on the Organization record and incremented on each message send. Trial expiry is a server-side check surfaced as a client banner.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma ORM, Stripe SDK (`stripe` npm package), Sonner, Tailwind CSS, shadcn/ui

**Prerequisite:** Stripe account with products/prices configured. Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in `.env`.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/lib/quota.ts` |
| Create | `src/lib/stripe.ts` |
| Create | `src/middleware/quota-check.ts` |
| Create | `src/app/api/billing/checkout/route.ts` |
| Create | `src/app/api/billing/portal/route.ts` |
| Create | `src/app/api/billing/webhook/route.ts` |
| Create | `src/app/api/export/gdpr/route.ts` |
| Create | `src/components/billing/upgrade-gate.tsx` |
| Create | `src/components/billing/trial-banner.tsx` |
| Create | `src/components/billing/usage-meter.tsx` |
| Modify | `src/app/dashboard/layout.tsx` |
| Modify | `src/components/settings/BillingTab.tsx` (or wherever billing UI lives) |
| Modify | `src/app/api/campaigns/[id]/launch/route.ts` |
| Modify | `src/app/api/contacts/route.ts` |

---

## Task 1: Define plan limits and quota checking library

**Files:**
- Create: `src/lib/quota.ts`

- [ ] **Step 1: Create the quota library**

```ts
// src/lib/quota.ts
import { prisma } from "@/lib/prisma"

export type PlanId = "free" | "starter" | "growth" | "enterprise"

export interface PlanLimits {
  messagesPerMonth: number   // -1 = unlimited
  contacts: number           // -1 = unlimited
  campaigns: number          // -1 = unlimited
  teamMembers: number
  automations: number
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    messagesPerMonth: 1000,
    contacts: 500,
    campaigns: 3,
    teamMembers: 1,
    automations: 0,
  },
  starter: {
    messagesPerMonth: 10000,
    contacts: 5000,
    campaigns: -1,
    teamMembers: 3,
    automations: 5,
  },
  growth: {
    messagesPerMonth: 50000,
    contacts: 25000,
    campaigns: -1,
    teamMembers: 10,
    automations: -1,
  },
  enterprise: {
    messagesPerMonth: -1,
    contacts: -1,
    campaigns: -1,
    teamMembers: -1,
    automations: -1,
  },
}

export interface QuotaStatus {
  allowed: boolean
  reason?: string
  current?: number
  limit?: number
}

export async function checkMessageQuota(organizationId: string): Promise<QuotaStatus> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, messagesThisMonth: true, trialEndsAt: true },
  })
  if (!org) return { allowed: false, reason: "Organization not found" }

  // Check trial expiry
  if (org.trialEndsAt && new Date() > new Date(org.trialEndsAt)) {
    return { allowed: false, reason: "Your trial has expired. Please upgrade to continue sending messages." }
  }

  const plan = (org.plan as PlanId) ?? "free"
  const limits = PLAN_LIMITS[plan]

  if (limits.messagesPerMonth === -1) return { allowed: true }

  const used = org.messagesThisMonth ?? 0
  if (used >= limits.messagesPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your ${limits.messagesPerMonth.toLocaleString()} message limit for this month. Upgrade your plan to send more.`,
      current: used,
      limit: limits.messagesPerMonth,
    }
  }

  return { allowed: true, current: used, limit: limits.messagesPerMonth }
}

export async function checkContactQuota(organizationId: string): Promise<QuotaStatus> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  })
  if (!org) return { allowed: false, reason: "Organization not found" }

  const plan = (org.plan as PlanId) ?? "free"
  const limits = PLAN_LIMITS[plan]

  if (limits.contacts === -1) return { allowed: true }

  const count = await prisma.contact.count({ where: { organizationId } })
  if (count >= limits.contacts) {
    return {
      allowed: false,
      reason: `You've reached your ${limits.contacts.toLocaleString()} contact limit. Upgrade your plan to add more contacts.`,
      current: count,
      limit: limits.contacts,
    }
  }

  return { allowed: true, current: count, limit: limits.contacts }
}

export async function incrementMessageCount(organizationId: string, count: number = 1) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { messagesThisMonth: { increment: count } },
  })
}

export async function getUsageSummary(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      messagesThisMonth: true,
      trialEndsAt: true,
      trialStartedAt: true,
    },
  })
  if (!org) return null

  const plan = (org.plan as PlanId) ?? "free"
  const limits = PLAN_LIMITS[plan]
  const contactCount = await prisma.contact.count({ where: { organizationId } })

  return {
    plan,
    limits,
    usage: {
      messagesThisMonth: org.messagesThisMonth ?? 0,
      contacts: contactCount,
    },
    trial: {
      endsAt: org.trialEndsAt,
      daysRemaining: org.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
      isExpired: org.trialEndsAt ? new Date() > new Date(org.trialEndsAt) : false,
    },
  }
}
```

**Important:** This requires two new fields on the `Organization` Prisma model:
- `messagesThisMonth Int @default(0)`
- `trialEndsAt DateTime?`
- `trialStartedAt DateTime?`
- `plan String @default("free")`

Add these to `prisma/schema.prisma` and run `npx prisma migrate dev --name add_quota_fields`.

- [ ] **Step 2: Run the migration**

```bash
npx prisma migrate dev --name add_quota_fields
```

Expected output: `The following migration(s) have been created and applied from new schema changes: migrations/TIMESTAMP_add_quota_fields`

- [ ] **Step 3: Commit**

```bash
git add src/lib/quota.ts prisma/schema.prisma prisma/migrations/
git commit -m "feat: add quota library and org plan/usage schema fields"
```

---

## Task 2: Enforce message quota on campaign launch

**Files:**
- Modify: `src/app/api/campaigns/[id]/launch/route.ts`

- [ ] **Step 1: Read the launch route**

Read `src/app/api/campaigns/[id]/launch/route.ts` fully.

- [ ] **Step 2: Add quota check at the top of the POST handler**

After the auth check and before any campaign processing, add:

```ts
import { checkMessageQuota, incrementMessageCount } from "@/lib/quota"

// Inside the POST handler, after getting organizationId:
const quota = await checkMessageQuota(organizationId)
if (!quota.allowed) {
  return NextResponse.json(
    { success: false, error: quota.reason, code: "QUOTA_EXCEEDED" },
    { status: 402 }
  )
}
```

After the campaign finishes sending (or is queued), increment the count by the audience size:

```ts
// After successful launch, e.g. where audienceSize is known:
await incrementMessageCount(organizationId, audienceSize)
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/campaigns/[id]/launch/route.ts
git commit -m "fix: enforce message quota before launching campaigns"
```

---

## Task 3: Enforce contact quota on contact creation

**Files:**
- Modify: `src/app/api/contacts/route.ts`

- [ ] **Step 1: Read the contacts POST handler**

Read `src/app/api/contacts/route.ts` and find the POST handler.

- [ ] **Step 2: Add quota check**

At the top of the POST handler body (after auth):

```ts
import { checkContactQuota } from "@/lib/quota"

const quota = await checkContactQuota(organizationId)
if (!quota.allowed) {
  return NextResponse.json(
    { success: false, error: quota.reason, code: "QUOTA_EXCEEDED" },
    { status: 402 }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contacts/route.ts
git commit -m "fix: enforce contact quota before creating contacts"
```

---

## Task 4: Stripe integration library

**Files:**
- Create: `src/lib/stripe.ts`

- [ ] **Step 1: Install Stripe SDK**

```bash
npm install stripe @stripe/stripe-js
```

Expected: `added 2 packages`

- [ ] **Step 2: Create the Stripe client**

```ts
// src/lib/stripe.ts
import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
})

// Map plan IDs to Stripe Price IDs — set these in .env
export const STRIPE_PRICE_IDS: Record<string, string> = {
  starter:    process.env.STRIPE_PRICE_STARTER ?? "",
  growth:     process.env.STRIPE_PRICE_GROWTH ?? "",
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? "",
}
```

Add to `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe.ts
git commit -m "feat: add Stripe client library"
```

---

## Task 5: Stripe Checkout session endpoint

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`

- [ ] **Step 1: Create the checkout route**

```ts
// src/app/api/billing/checkout/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const organizationId = (session.user as any).organizationId
  const { plan } = await request.json()

  const priceId = STRIPE_PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true, name: true },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: org?.stripeCustomerId ?? undefined,
    customer_email: !org?.stripeCustomerId ? session.user?.email ?? undefined : undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/settings?tab=billing&upgraded=true`,
    cancel_url: `${baseUrl}/dashboard/settings?tab=billing`,
    metadata: { organizationId, plan },
    subscription_data: {
      metadata: { organizationId, plan },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
```

Add `stripeCustomerId String?` to the `Organization` model in Prisma schema, then run migration:
```bash
npx prisma migrate dev --name add_stripe_customer_id
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/billing/checkout/route.ts prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Stripe checkout session endpoint"
```

---

## Task 6: Stripe Customer Portal endpoint

**Files:**
- Create: `src/app/api/billing/portal/route.ts`

- [ ] **Step 1: Create the portal route**

```ts
// src/app/api/billing/portal/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const organizationId = (session.user as any).organizationId
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true },
  })

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found. Please subscribe to a plan first." }, { status: 400 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${baseUrl}/dashboard/settings?tab=billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/billing/portal/route.ts
git commit -m "feat: add Stripe customer portal endpoint"
```

---

## Task 7: Stripe webhook handler — update plan on subscription events

**Files:**
- Create: `src/app/api/billing/webhook/route.ts`

- [ ] **Step 1: Create the webhook handler**

```ts
// src/app/api/billing/webhook/route.ts
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const organizationId = session.metadata?.organizationId
    const plan = session.metadata?.plan

    if (organizationId && plan && session.customer) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan,
          stripeCustomerId: session.customer as string,
          // Reset trial
          trialEndsAt: null,
        },
      })
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    const organizationId = sub.metadata?.organizationId
    if (organizationId) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { plan: "free" },
      })
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription
    const organizationId = sub.metadata?.organizationId
    const plan = sub.metadata?.plan
    if (organizationId && plan) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { plan },
      })
    }
  }

  return NextResponse.json({ received: true })
}

export const config = { api: { bodyParser: false } }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/billing/webhook/route.ts
git commit -m "feat: add Stripe webhook handler for subscription events"
```

---

## Task 8: Trial expiry banner component

**Files:**
- Create: `src/components/billing/trial-banner.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create the banner component**

```tsx
// src/components/billing/trial-banner.tsx
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AlertTriangle, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TrialInfo {
  daysRemaining: number | null
  isExpired: boolean
  plan: string
}

export function TrialBanner() {
  const { data: session } = useSession()
  const router = useRouter()
  const [trial, setTrial] = useState<TrialInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!session) return
    fetch("/api/billing/usage")
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setTrial({
            daysRemaining: data.trial?.daysRemaining ?? null,
            isExpired: data.trial?.isExpired ?? false,
            plan: data.plan,
          })
        }
      })
      .catch(() => {})
  }, [session])

  if (!trial) return null
  if (trial.plan !== "free") return null  // Paid users don't see this
  if (dismissed && !trial.isExpired) return null

  const isUrgent = trial.isExpired || (trial.daysRemaining !== null && trial.daysRemaining <= 3)

  if (trial.daysRemaining === null && !trial.isExpired) return null  // No trial set

  return (
    <div className={`w-full px-4 py-2.5 flex items-center justify-between gap-4 ${isUrgent ? "bg-red-600" : "bg-amber-500"}`}>
      <div className="flex items-center gap-2 text-white text-sm">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        {trial.isExpired ? (
          <span className="font-medium">Your trial has expired. Upgrade now to keep sending messages.</span>
        ) : (
          <span>
            <span className="font-semibold">{trial.daysRemaining} day{trial.daysRemaining !== 1 ? "s" : ""}</span> left in your free trial.
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={() => router.push("/dashboard/settings?tab=billing")}
          className="bg-white text-amber-700 hover:bg-white/90 rounded-lg text-xs gap-1 h-7"
        >
          <Zap className="h-3 w-3" />
          Upgrade
        </Button>
        {!trial.isExpired && (
          <button onClick={() => setDismissed(true)} className="text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the usage API endpoint**

Create `src/app/api/billing/usage/route.ts`:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUsageSummary } from "@/lib/quota"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  const summary = await getUsageSummary(organizationId)
  if (!summary) return NextResponse.json({ error: "Organization not found" }, { status: 404 })

  return NextResponse.json({ success: true, ...summary })
}
```

- [ ] **Step 3: Mount the banner in dashboard layout**

In `src/app/dashboard/layout.tsx`, add before `{children}`:

```tsx
import { TrialBanner } from "@/components/billing/trial-banner"

// Inside layout JSX, above {children}:
<TrialBanner />
{children}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/billing/trial-banner.tsx src/app/api/billing/usage/ src/app/dashboard/layout.tsx
git commit -m "feat: add trial expiry banner and usage API endpoint"
```

---

## Task 9: Usage meter component in billing settings

**Files:**
- Create: `src/components/billing/usage-meter.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/billing/usage-meter.tsx
"use client"

interface UsageMeterProps {
  label: string
  current: number
  limit: number  // -1 = unlimited
}

export function UsageMeter({ label, current, limit }: UsageMeterProps) {
  if (limit === -1) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{current.toLocaleString()} / Unlimited</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100">
          <div className="h-full w-full rounded-full bg-green-500" />
        </div>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((current / limit) * 100))
  const isNearLimit = pct >= 80
  const isAtLimit = pct >= 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${isAtLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : ""}`}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-green-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{pct}% used</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/billing/usage-meter.tsx
git commit -m "feat: add usage meter component for billing settings"
```

---

## Task 10: Update billing settings tab

**Files:**
- Modify: The billing tab component (find it in `src/app/dashboard/settings/page.tsx` or `src/components/settings/`)

- [ ] **Step 1: Read the billing tab**

Read `src/app/dashboard/settings/page.tsx` and find the billing tab JSX section.

- [ ] **Step 2: Replace static billing UI with dynamic plan + usage display**

Add these imports to the settings page:
```tsx
import { UsageMeter } from "@/components/billing/usage-meter"
import { PLAN_LIMITS } from "@/lib/quota"
```

In the billing tab section, add a usage fetch:
```tsx
// Add state near the top of the settings page component:
const [usage, setUsage] = useState<any>(null)

useEffect(() => {
  fetch("/api/billing/usage")
    .then(r => r.json())
    .then(data => { if (data.success) setUsage(data) })
    .catch(() => {})
}, [])
```

Replace the static plan cards with dynamic ones. For the current plan:
```tsx
{usage && (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Badge className="bg-green-100 text-green-800 border-0 text-sm px-3 py-1">
        {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} Plan
      </Badge>
      {usage.trial?.daysRemaining !== null && !usage.trial?.isExpired && (
        <span className="text-sm text-muted-foreground">
          Trial ends in {usage.trial.daysRemaining} day{usage.trial.daysRemaining !== 1 ? "s" : ""}
        </span>
      )}
    </div>
    <div className="space-y-4">
      <UsageMeter
        label="Messages this month"
        current={usage.usage.messagesThisMonth}
        limit={usage.limits.messagesPerMonth}
      />
      <UsageMeter
        label="Contacts"
        current={usage.usage.contacts}
        limit={usage.limits.contacts}
      />
    </div>
  </div>
)}
```

Replace "Coming Soon" upgrade buttons with real Stripe Checkout:
```tsx
async function handleUpgrade(plan: string) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  })
  const data = await res.json()
  if (data.url) window.location.href = data.url
  else toast.error(data.error ?? "Failed to start checkout")
}

async function handleManageBilling() {
  const res = await fetch("/api/billing/portal", { method: "POST" })
  const data = await res.json()
  if (data.url) window.location.href = data.url
  else toast.error(data.error ?? "No billing account found")
}
```

Replace every plan upgrade button `onClick` with `() => handleUpgrade("starter")` etc.
Add a "Manage billing" button that calls `handleManageBilling()`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/settings/page.tsx
git commit -m "feat: connect billing settings to Stripe Checkout and usage meters"
```

---

## Task 11: GDPR data export endpoint

**Files:**
- Create: `src/app/api/export/gdpr/route.ts`

- [ ] **Step 1: Create the GDPR export route**

```ts
// src/app/api/export/gdpr/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id
  const organizationId = (session.user as any).organizationId

  const [user, contacts, campaigns, templates] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.contact.findMany({
      where: { organizationId },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true, optInStatus: true, createdAt: true },
    }),
    prisma.campaign.findMany({
      where: { organizationId },
      select: { id: true, name: true, type: true, status: true, createdAt: true },
    }),
    prisma.template.findMany({
      where: { organizationId },
      select: { id: true, name: true, category: true, status: true, createdAt: true },
    }),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: user,
    contacts,
    campaigns,
    templates,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="whatsapp-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  })
}
```

- [ ] **Step 2: Add "Export My Data" button to Privacy settings tab**

Read `src/components/settings/PrivacySettingsTab.tsx`. Add a button:

```tsx
<Button
  variant="outline"
  onClick={() => { window.location.href = "/api/export/gdpr" }}
  className="rounded-lg gap-2"
>
  <Download className="h-4 w-4" />
  Export My Data (GDPR)
</Button>
```

Add `import { Download } from "lucide-react"` if not present.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/export/gdpr/ src/components/settings/PrivacySettingsTab.tsx
git commit -m "feat: add GDPR data export endpoint and privacy settings button"
```

---

## Task 12: Upgrade gate component for locked features

**Files:**
- Create: `src/components/billing/upgrade-gate.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/billing/upgrade-gate.tsx
"use client"

import { useRouter } from "next/navigation"
import { Lock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UpgradeGateProps {
  feature: string
  requiredPlan: string
  children: React.ReactNode
  locked: boolean
}

export function UpgradeGate({ feature, requiredPlan, children, locked }: UpgradeGateProps) {
  const router = useRouter()

  if (!locked) return <>{children}</>

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">{feature} is locked</p>
        <p className="text-xs text-muted-foreground mb-4">Available on the {requiredPlan} plan and above</p>
        <Button
          onClick={() => router.push("/dashboard/settings?tab=billing")}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg gap-1 text-sm h-8"
        >
          <Zap className="h-3 w-3" />
          Upgrade
        </Button>
      </div>
    </div>
  )
}
```

Use this in any feature that is plan-gated:
```tsx
<UpgradeGate feature="Automation" requiredPlan="Starter" locked={usage?.plan === "free"}>
  {/* automation content */}
</UpgradeGate>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/billing/upgrade-gate.tsx
git commit -m "feat: add UpgradeGate component for plan-locked features"
```

---

## Self-Review Checklist

- [x] Quota library: message + contact limits per plan, increment function
- [x] Prisma schema: messagesThisMonth, trialEndsAt, plan, stripeCustomerId fields
- [x] Campaign launch: quota checked before launch, count incremented after
- [x] Contact create: quota checked before creation
- [x] Stripe: checkout session, customer portal, webhook handler
- [x] Webhook updates org.plan on subscription events
- [x] Trial banner: shows days remaining, upgrade button, dismissible
- [x] Usage meter: progress bars with red/amber/green states
- [x] Billing settings: dynamic usage display + Stripe Checkout buttons
- [x] GDPR export: JSON download with all user data
- [x] UpgradeGate: overlay for locked features
