# Sprint 2: Complete the Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the missing core features that block real usage — a visual segment rule builder, new-user onboarding wizard, basic automation workflows (trigger → action), contact activity timeline, tags management page, and opt-out management.

**Architecture:** Each feature is a self-contained addition. The segment builder is a new component added to both the segments page and the campaign wizard. The onboarding wizard is a modal that fires once for new users (tracked via localStorage flag + DB field). Automation builds on the existing `/api/automation` route. Contact timeline is added to the existing drawer component.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM, Sonner, Lucide React

---

## File Map

| Action | File |
|--------|------|
| Create | `src/components/segments/segment-rule-builder.tsx` |
| Create | `src/components/segments/segment-builder-dialog.tsx` |
| Create | `src/components/onboarding/onboarding-wizard.tsx` |
| Create | `src/components/onboarding/onboarding-step-connect.tsx` |
| Create | `src/components/onboarding/onboarding-step-contacts.tsx` |
| Create | `src/components/onboarding/onboarding-step-template.tsx` |
| Create | `src/components/onboarding/onboarding-step-campaign.tsx` |
| Create | `src/components/automation/automation-trigger-select.tsx` |
| Create | `src/components/automation/automation-action-builder.tsx` |
| Create | `src/app/dashboard/tags/page.tsx` |
| Create | `src/app/dashboard/optouts/page.tsx` |
| Create | `src/app/api/tags/route.ts` |
| Create | `src/app/api/optouts/route.ts` |
| Modify | `src/app/dashboard/segments/page.tsx` |
| Modify | `src/app/dashboard/automation/page.tsx` |
| Modify | `src/components/contacts/contact-detail-drawer.tsx` |
| Modify | `src/app/dashboard/layout.tsx` |
| Modify | `src/components/header.tsx` |

---

## Task 1: Segment rule builder component

**Files:**
- Create: `src/components/segments/segment-rule-builder.tsx`

The rule builder supports conditions like `tag = X`, `status = active`, `created_after = date`, joined with AND/OR.

- [ ] **Step 1: Create the component**

```tsx
// src/components/segments/segment-rule-builder.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"

export type ConditionField = "tag" | "status" | "lifecycle" | "created_after" | "created_before" | "phone_contains"
export type ConditionOperator = "equals" | "not_equals" | "contains" | "after" | "before"

export interface SegmentCondition {
  id: string
  field: ConditionField
  operator: ConditionOperator
  value: string
}

export interface SegmentRules {
  logic: "AND" | "OR"
  conditions: SegmentCondition[]
}

const FIELD_OPTIONS: { value: ConditionField; label: string }[] = [
  { value: "tag", label: "Tag" },
  { value: "status", label: "Opt-in status" },
  { value: "lifecycle", label: "Lifecycle stage" },
  { value: "created_after", label: "Created after" },
  { value: "created_before", label: "Created before" },
  { value: "phone_contains", label: "Phone contains" },
]

const STATUS_VALUES = ["opted_in", "opted_out", "pending"]
const LIFECYCLE_VALUES = ["lead", "prospect", "customer", "churned", "vip"]

function getOperatorsForField(field: ConditionField): { value: ConditionOperator; label: string }[] {
  if (field === "created_after" || field === "created_before") {
    return [{ value: "after", label: "is after" }, { value: "before", label: "is before" }]
  }
  if (field === "phone_contains") {
    return [{ value: "contains", label: "contains" }]
  }
  return [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
  ]
}

function ValueInput({ field, value, onChange }: { field: ConditionField; value: string; onChange: (v: string) => void }) {
  if (field === "status") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40 rounded-lg h-9">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_VALUES.map(v => <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>)}
        </SelectContent>
      </Select>
    )
  }
  if (field === "lifecycle") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40 rounded-lg h-9">
          <SelectValue placeholder="Select stage" />
        </SelectTrigger>
        <SelectContent>
          {LIFECYCLE_VALUES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>
    )
  }
  if (field === "created_after" || field === "created_before") {
    return <Input type="date" value={value} onChange={e => onChange(e.target.value)} className="w-44 rounded-lg h-9" />
  }
  return <Input placeholder="Enter value…" value={value} onChange={e => onChange(e.target.value)} className="w-44 rounded-lg h-9" />
}

interface SegmentRuleBuilderProps {
  value: SegmentRules
  onChange: (rules: SegmentRules) => void
}

let nextId = 1

export function SegmentRuleBuilder({ value, onChange }: SegmentRuleBuilderProps) {
  const addCondition = () => {
    onChange({
      ...value,
      conditions: [
        ...value.conditions,
        { id: String(nextId++), field: "tag", operator: "equals", value: "" },
      ],
    })
  }

  const removeCondition = (id: string) => {
    onChange({ ...value, conditions: value.conditions.filter(c => c.id !== id) })
  }

  const updateCondition = (id: string, patch: Partial<SegmentCondition>) => {
    onChange({
      ...value,
      conditions: value.conditions.map(c => c.id === id ? { ...c, ...patch } : c),
    })
  }

  return (
    <div className="space-y-3">
      {value.conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Match</span>
          <Select value={value.logic} onValueChange={v => onChange({ ...value, logic: v as "AND" | "OR" })}>
            <SelectTrigger className="w-20 h-7 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">ALL</SelectItem>
              <SelectItem value="OR">ANY</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">of the following conditions</span>
        </div>
      )}

      <div className="space-y-2">
        {value.conditions.map((condition) => {
          const operators = getOperatorsForField(condition.field)
          return (
            <div key={condition.id} className="flex items-center gap-2 flex-wrap">
              <Select
                value={condition.field}
                onValueChange={v => updateCondition(condition.id, { field: v as ConditionField, operator: getOperatorsForField(v as ConditionField)[0].value, value: "" })}
              >
                <SelectTrigger className="w-40 rounded-lg h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={condition.operator} onValueChange={v => updateCondition(condition.id, { operator: v as ConditionOperator })}>
                <SelectTrigger className="w-28 rounded-lg h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <ValueInput
                field={condition.field}
                value={condition.value}
                onChange={v => updateCondition(condition.id, { value: v })}
              />

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-red-600"
                onClick={() => removeCondition(condition.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition} className="rounded-lg gap-1 text-xs">
        <Plus className="h-3 w-3" />
        Add condition
      </Button>

      {value.conditions.length === 0 && (
        <p className="text-xs text-muted-foreground">No conditions — this segment will include all contacts.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/segments/segment-rule-builder.tsx
git commit -m "feat: add segment rule builder component"
```

---

## Task 2: Segment builder dialog (wraps rule builder with name + save)

**Files:**
- Create: `src/components/segments/segment-builder-dialog.tsx`

- [ ] **Step 1: Create the dialog**

```tsx
// src/components/segments/segment-builder-dialog.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SegmentRuleBuilder, SegmentRules } from "./segment-rule-builder"
import { Loader2 } from "lucide-react"

interface SegmentBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initial?: { id: string; name: string; rules: SegmentRules }
}

const defaultRules: SegmentRules = { logic: "AND", conditions: [] }

export function SegmentBuilderDialog({ open, onOpenChange, onSaved, initial }: SegmentBuilderDialogProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [rules, setRules] = useState<SegmentRules>(initial?.rules ?? defaultRules)
  const [nameError, setNameError] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("Segment name is required")
      return
    }
    setNameError("")
    setSaving(true)
    try {
      const method = initial ? "PUT" : "POST"
      const url = initial ? `/api/segments/${initial.id}` : "/api/segments"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rules: JSON.stringify(rules) }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed to save")
      toast.success(initial ? "Segment updated" : "Segment created")
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save segment")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Segment" : "Create Segment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="seg-name">Segment name</Label>
            <Input
              id="seg-name"
              value={name}
              onChange={e => { setName(e.target.value); if (e.target.value) setNameError("") }}
              placeholder="e.g., Active Customers"
              className="rounded-lg"
            />
            {nameError && <p className="text-xs text-red-600">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Filter conditions</Label>
            <SegmentRuleBuilder value={rules} onChange={setRules} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? "Save changes" : "Create segment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/segments/segment-builder-dialog.tsx
git commit -m "feat: add segment builder dialog with rule builder"
```

---

## Task 3: Wire SegmentBuilderDialog into the Segments page

**Files:**
- Modify: `src/app/dashboard/segments/page.tsx`

- [ ] **Step 1: Replace the simple name-only Create dialog with the full builder**

Add import:
```tsx
import { SegmentBuilderDialog } from "@/components/segments/segment-builder-dialog"
import { SegmentRules } from "@/components/segments/segment-rule-builder"
```

- [ ] **Step 2: Replace the existing `<Dialog open={showCreateDialog}>` block**

Delete the old Create Segment Dialog JSX block (the one with just a name input). Replace with:

```tsx
<SegmentBuilderDialog
  open={showCreateDialog}
  onOpenChange={setShowCreateDialog}
  onSaved={fetchSegments}
/>
```

- [ ] **Step 3: Add edit support**

Add state:
```tsx
const [editSegment, setEditSegment] = useState<{ id: string; name: string; rules: SegmentRules } | null>(null)
```

In the dropdown menu, wire the Edit item:
```tsx
<DropdownMenuItem
  onClick={() => {
    setEditSegment({
      id: segment.id,
      name: segment.name,
      rules: (() => { try { return JSON.parse(segment.rules) } catch { return { logic: "AND", conditions: [] } } })(),
    })
  }}
>
  <Edit className="mr-2 h-4 w-4" />
  Edit
</DropdownMenuItem>
```

Add the edit dialog after the create dialog:
```tsx
{editSegment && (
  <SegmentBuilderDialog
    open={!!editSegment}
    onOpenChange={open => { if (!open) setEditSegment(null) }}
    onSaved={fetchSegments}
    initial={editSegment}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/segments/page.tsx
git commit -m "feat: wire full segment rule builder into segments page"
```

---

## Task 4: Backend — add PUT endpoint for segments

**Files:**
- Read: `src/app/api/segments/route.ts`
- Create: `src/app/api/segments/[id]/route.ts` (if it doesn't exist)

- [ ] **Step 1: Read current segments API**

Read `src/app/api/segments/route.ts` to understand the schema and auth pattern.

- [ ] **Step 2: Check if `[id]` route exists**

Run: `ls "src/app/api/segments/"` — if `[id]/route.ts` doesn't exist, create it.

- [ ] **Step 3: Create/update the [id] route**

```ts
// src/app/api/segments/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  const body = await request.json()
  const { name, rules } = body

  if (!name?.trim()) {
    return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
  }

  try {
    const segment = await prisma.segment.update({
      where: { id: params.id, organizationId },
      data: { name: name.trim(), rules },
    })
    return NextResponse.json({ success: true, segment })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update segment" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  try {
    await prisma.segment.delete({ where: { id: params.id, organizationId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete segment" }, { status: 500 })
  }
}
```

Adapt model name if Prisma schema uses a different name (check `prisma/schema.prisma`).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/segments/
git commit -m "feat: add PUT and DELETE endpoints for individual segments"
```

---

## Task 5: Onboarding wizard — new user setup flow

**Files:**
- Create: `src/components/onboarding/onboarding-wizard.tsx`

The wizard shows once when `localStorage.getItem('onboarding_complete')` is null AND the user has 0 campaigns. It has 4 steps.

- [ ] **Step 1: Create the wizard**

```tsx
// src/components/onboarding/onboarding-wizard.tsx
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, MessageSquare, Users, Send, Zap, ChevronRight, X } from "lucide-react"

const STEPS = [
  {
    id: "connect",
    icon: Zap,
    title: "Connect WhatsApp",
    description: "Link your WhatsApp Business account to start sending messages.",
    cta: "Connect Now",
    href: "/dashboard/connect",
    skip: "I'll do this later",
  },
  {
    id: "contacts",
    icon: Users,
    title: "Import your contacts",
    description: "Upload a CSV or add contacts manually to build your audience.",
    cta: "Import Contacts",
    href: "/dashboard/contacts",
    skip: "Skip for now",
  },
  {
    id: "template",
    icon: MessageSquare,
    title: "Create a message template",
    description: "Templates must be approved by Meta before sending. Create your first one now.",
    cta: "Create Template",
    href: "/dashboard/templates/create",
    skip: "Skip for now",
  },
  {
    id: "campaign",
    icon: Send,
    title: "Launch your first campaign",
    description: "You're ready. Send your first WhatsApp campaign to your contacts.",
    cta: "Create Campaign",
    href: "/dashboard/campaigns/new",
    skip: null,
  },
]

const STORAGE_KEY = "onboarding_dismissed"

export function OnboardingWizard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    if (!session) return
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) return

    // Show wizard for accounts < 24 hours old
    const createdAt = (session.user as any)?.createdAt
    if (createdAt) {
      const age = Date.now() - new Date(createdAt).getTime()
      if (age < 24 * 60 * 60 * 1000) {
        setIsNewUser(true)
        setOpen(true)
      }
    } else {
      // Fallback: show if no campaigns exist
      fetch("/api/campaigns?limit=1")
        .then(r => r.json())
        .then(data => {
          if (data.total === 0) {
            setIsNewUser(true)
            setOpen(true)
          }
        })
        .catch(() => {})
    }
  }, [session])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setOpen(false)
  }

  const step = STEPS[currentStep]
  const StepIcon = step.icon

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" hideCloseButton>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i < currentStep ? "w-8 bg-green-500" :
                  i === currentStep ? "w-8 bg-green-500" :
                  "w-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Step label */}
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Step {currentStep + 1} of {STEPS.length}
          </p>

          {/* Icon */}
          <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
            <StepIcon className="h-7 w-7 text-green-600" />
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground mb-8">{step.description}</p>

          {/* Checklist of completed steps */}
          {currentStep > 0 && (
            <div className="space-y-2 mb-6">
              {STEPS.slice(0, currentStep).map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground line-through">{s.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg gap-1"
              onClick={() => {
                if (currentStep === STEPS.length - 1) {
                  dismiss()
                  router.push(step.href)
                } else {
                  router.push(step.href)
                  setCurrentStep(prev => prev + 1)
                }
              }}
            >
              {step.cta}
              <ChevronRight className="h-4 w-4" />
            </Button>
            {step.skip && (
              <Button
                variant="ghost"
                className="text-muted-foreground text-sm rounded-lg"
                onClick={() => {
                  if (currentStep < STEPS.length - 1) {
                    setCurrentStep(prev => prev + 1)
                  } else {
                    dismiss()
                  }
                }}
              >
                {step.skip}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding/onboarding-wizard.tsx
git commit -m "feat: add new-user onboarding wizard"
```

---

## Task 6: Mount onboarding wizard in dashboard layout

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Read the dashboard layout**

Read `src/app/dashboard/layout.tsx` fully.

- [ ] **Step 2: Add wizard import and render**

Add import:
```tsx
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"
```

Add inside the layout JSX, anywhere inside the authenticated wrapper (before or after `{children}`):
```tsx
<OnboardingWizard />
{children}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: mount onboarding wizard in dashboard layout"
```

---

## Task 7: Contact activity timeline in drawer

**Files:**
- Modify: `src/components/contacts/contact-detail-drawer.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/contacts/contact-detail-drawer.tsx` fully to understand the drawer structure and what data it receives.

- [ ] **Step 2: Add activity fetch**

Inside the component, add a state and fetch for message history:

```tsx
const [activity, setActivity] = useState<Array<{
  id: string
  type: "message_sent" | "message_received" | "status_change" | "tag_added"
  description: string
  createdAt: string
}>>([])
const [activityLoading, setActivityLoading] = useState(false)

useEffect(() => {
  if (!contact?.id) return
  setActivityLoading(true)
  fetch(`/api/contacts/${contact.id}/activity`)
    .then(r => r.json())
    .then(data => {
      if (data.success) setActivity(data.activity ?? [])
    })
    .catch(() => {})
    .finally(() => setActivityLoading(false))
}, [contact?.id])
```

- [ ] **Step 3: Add activity section to the drawer JSX**

Find the end of the drawer content (after tags/status sections) and add:

```tsx
<div className="mt-6">
  <h4 className="text-sm font-semibold text-foreground mb-3">Activity</h4>
  {activityLoading ? (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  ) : activity.length === 0 ? (
    <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
  ) : (
    <div className="space-y-4">
      {activity.map(item => (
        <div key={item.id} className="flex gap-3">
          <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-foreground">{item.description}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

Add `import { Skeleton } from "@/components/ui/skeleton"` to the imports if not present.

- [ ] **Step 4: Create the contact activity API endpoint**

Create `src/app/api/contacts/[id]/activity/route.ts`:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  try {
    // Fetch messages sent to/from this contact
    const messages = await prisma.message.findMany({
      where: { contactId: params.id, organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, direction: true, content: true, status: true, createdAt: true },
    })

    const activity = messages.map(m => ({
      id: m.id,
      type: m.direction === "outbound" ? "message_sent" as const : "message_received" as const,
      description: m.direction === "outbound"
        ? `Message sent — ${m.status}`
        : `Reply received`,
      createdAt: m.createdAt.toISOString(),
    }))

    return NextResponse.json({ success: true, activity })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch activity" }, { status: 500 })
  }
}
```

Adapt `prisma.message` model and field names to match your schema.

- [ ] **Step 5: Commit**

```bash
git add src/components/contacts/contact-detail-drawer.tsx src/app/api/contacts/
git commit -m "feat: add contact activity timeline to contact detail drawer"
```

---

## Task 8: Tags management page

**Files:**
- Create: `src/app/dashboard/tags/page.tsx`
- Create: `src/app/api/tags/route.ts`

- [ ] **Step 1: Create the tags API route**

```ts
// src/app/api/tags/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  // Tags are stored as comma-separated strings on contacts
  // Extract all unique tags from the organization's contacts
  const contacts = await prisma.contact.findMany({
    where: { organizationId, tags: { not: null } },
    select: { tags: true },
  })

  const tagMap = new Map<string, number>()
  for (const contact of contacts) {
    if (!contact.tags) continue
    const tags = contact.tags.split(",").map(t => t.trim()).filter(Boolean)
    for (const tag of tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
    }
  }

  const tags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ success: true, tags })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  const { tag } = await request.json()
  if (!tag) return NextResponse.json({ success: false, error: "Tag name required" }, { status: 400 })

  // Remove this tag from all contacts
  const contacts = await prisma.contact.findMany({
    where: { organizationId, tags: { contains: tag } },
    select: { id: true, tags: true },
  })

  await Promise.all(
    contacts.map(c => {
      const updated = c.tags!.split(",").map(t => t.trim()).filter(t => t && t !== tag).join(",")
      return prisma.contact.update({ where: { id: c.id }, data: { tags: updated || null } })
    })
  )

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the tags page**

```tsx
// src/app/dashboard/tags/page.tsx
"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Tag, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StandardLayout } from "@/components/ui/standard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { PageError } from "@/components/ui/page-error"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TagEntry { name: string; count: number }

export default function TagsPage() {
  const [tags, setTags] = useState<TagEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTag, setDeleteTag] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTags = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/tags")
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed to load tags")
      setTags(data.tags)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tags")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTags() }, [])

  const handleDelete = async () => {
    if (!deleteTag) return
    setDeleting(true)
    try {
      const res = await fetch("/api/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: deleteTag }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed to delete")
      toast.success(`Tag "${deleteTag}" removed from all contacts`)
      setDeleteTag(null)
      fetchTags()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete tag")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <StandardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">Manage tags across all your contacts</p>
        </div>

        {error && <PageError message={error} onRetry={fetchTags} />}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : tags.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No tags yet"
            description="Tags are added to contacts from the Contacts page. Once added, they'll appear here."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map(tag => (
              <div
                key={tag.name}
                className="flex items-center justify-between p-4 rounded-xl border-2 border-green-950 bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                    <Tag className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{tag.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {tag.count} contact{tag.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteTag(tag.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTag} onOpenChange={open => { if (!open) setDeleteTag(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove tag &ldquo;{deleteTag}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this tag from all contacts. The contacts themselves won&apos;t be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StandardLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/tags/ src/app/api/tags/
git commit -m "feat: add tags management page and API"
```

---

## Task 9: Opt-out management page

**Files:**
- Create: `src/app/dashboard/optouts/page.tsx`
- Create: `src/app/api/optouts/route.ts`

- [ ] **Step 1: Create the opt-out API**

```ts
// src/app/api/optouts/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get("page") ?? "1")
  const pageSize = Number(searchParams.get("pageSize") ?? "25")

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where: { organizationId, optInStatus: "opted_out" } }),
    prisma.contact.findMany({
      where: { organizationId, optInStatus: "opted_out" },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, firstName: true, lastName: true, phoneNumber: true, updatedAt: true },
    }),
  ])

  return NextResponse.json({ success: true, contacts, total, page, pageSize })
}

// Re-opt-in a contact
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  const { contactId } = await request.json()
  if (!contactId) return NextResponse.json({ success: false, error: "contactId required" }, { status: 400 })

  await prisma.contact.update({
    where: { id: contactId, organizationId },
    data: { optInStatus: "opted_in" },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the opt-out page**

```tsx
// src/app/dashboard/optouts/page.tsx
"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { UserX, RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StandardLayout } from "@/components/ui/standard-layout"
import { EmptyState } from "@/components/ui/empty-state"
import { PageError } from "@/components/ui/page-error"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface OptOut {
  id: string
  firstName: string
  lastName: string | null
  phoneNumber: string
  updatedAt: string
}

export default function OptOutsPage() {
  const [contacts, setContacts] = useState<OptOut[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [reinstating, setReinstating] = useState<string | null>(null)

  const fetchOptOuts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/optouts?pageSize=50")
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed to load")
      setContacts(data.contacts)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load opt-outs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOptOuts() }, [])

  const handleReinstate = async (contactId: string) => {
    setReinstating(contactId)
    try {
      const res = await fetch("/api/optouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success("Contact re-opted in")
      fetchOptOuts()
    } catch {
      toast.error("Failed to reinstate contact")
    } finally {
      setReinstating(null)
    }
  }

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName ?? ""} ${c.phoneNumber}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <StandardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opt-Outs</h1>
            <p className="text-muted-foreground mt-1">
              {total} contact{total !== 1 ? "s" : ""} have opted out of messages
            </p>
          </div>
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opted-out contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-lg"
          />
        </div>

        {error && <PageError message={error} onRetry={fetchOptOuts} />}

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UserX}
            title={search ? "No matches" : "No opt-outs"}
            description={search ? "No contacts match your search." : "Great news — no contacts have opted out yet."}
          />
        ) : (
          <div className="rounded-xl border-2 border-green-950 overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Opted out</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.firstName} {c.lastName ?? ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phoneNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reinstating === c.id}
                        onClick={() => handleReinstate(c.id)}
                        className="rounded-lg gap-1 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Re-opt in
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </StandardLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/optouts/ src/app/api/optouts/
git commit -m "feat: add opt-out management page and API"
```

---

## Task 10: Automation — basic trigger-based workflow builder

**Files:**
- Modify: `src/app/dashboard/automation/page.tsx`
- Create: `src/app/api/automation/route.ts` (replace stub if needed)

- [ ] **Step 1: Read the existing automation API**

Read `src/app/api/automation/route.ts` to see what's there.

- [ ] **Step 2: Rebuild the automation page with real workflow CRUD**

Replace `src/app/dashboard/automation/page.tsx` entirely:

```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus, Zap, UserPlus, MessageSquare, Timer, Play, Pause,
  Trash2, MoreHorizontal, Eye, Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StandardLayout } from "@/components/ui/standard-layout"
import { EmptyState } from "@/components/ui/empty-state"
import { PageError } from "@/components/ui/page-error"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Workflow {
  id: string
  name: string
  trigger: string
  status: "active" | "paused" | "draft"
  enrolledCount: number
  createdAt: string
}

const TRIGGER_LABELS: Record<string, string> = {
  new_contact:      "New contact added",
  reply_received:   "Contact replies",
  tag_added:        "Tag added to contact",
  campaign_sent:    "Campaign is sent",
  opted_in:         "Contact opts in",
}

function WorkflowStatusBadge({ status }: { status: Workflow["status"] }) {
  const map = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    draft:  "bg-gray-100 text-gray-700",
  }
  return <Badge className={`${map[status]} border-0 capitalize`}>{status}</Badge>
}

interface CreateWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function CreateWorkflowDialog({ open, onOpenChange, onCreated }: CreateWorkflowDialogProps) {
  const [name, setName] = useState("")
  const [trigger, setTrigger] = useState("new_contact")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Name is required"); return }
    if (!message.trim()) { toast.error("Message is required"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), trigger, steps: [{ type: "send_message", message }] }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success("Workflow created")
      onCreated()
      onOpenChange(false)
      setName(""); setTrigger("new_contact"); setMessage("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create workflow")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Automation Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Workflow name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Welcome new contacts" className="rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger</Label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Send message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hello {{name}}, welcome! How can we help you today?"
              rows={4}
              className="rounded-lg resize-none"
            />
            <p className="text-xs text-muted-foreground">Use {"{{"} name {"}}"}  to personalise the message.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
            Create workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AutomationPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const fetchWorkflows = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/automation")
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed to load")
      setWorkflows(data.workflows ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workflows")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWorkflows() }, [])

  const toggleStatus = async (w: Workflow) => {
    const newStatus = w.status === "active" ? "paused" : "active"
    try {
      const res = await fetch(`/api/automation/${w.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Workflow ${newStatus === "active" ? "activated" : "paused"}`)
      fetchWorkflows()
    } catch {
      toast.error("Failed to update workflow")
    }
  }

  const deleteWorkflow = async (id: string) => {
    try {
      const res = await fetch(`/api/automation/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success("Workflow deleted")
      fetchWorkflows()
    } catch {
      toast.error("Failed to delete workflow")
    }
  }

  return (
    <StandardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
            <p className="text-muted-foreground mt-1">Automated workflows that run when contacts take actions</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2">
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        </div>

        {error && <PageError message={error} onRetry={fetchWorkflows} />}

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No workflows yet"
            description="Create an automation workflow to automatically send messages when contacts take specific actions."
            action={{ label: "New Workflow", onClick: () => setShowCreate(true) }}
          />
        ) : (
          <div className="rounded-xl border-2 border-green-950 overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{TRIGGER_LABELS[w.trigger] ?? w.trigger}</TableCell>
                    <TableCell><WorkflowStatusBadge status={w.status} /></TableCell>
                    <TableCell className="text-sm">{w.enrolledCount}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleStatus(w)}>
                            {w.status === "active"
                              ? <><Pause className="mr-2 h-4 w-4" />Pause</>
                              : <><Play className="mr-2 h-4 w-4" />Activate</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteWorkflow(w.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <CreateWorkflowDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onCreated={fetchWorkflows}
        />
      </div>
    </StandardLayout>
  )
}
```

- [ ] **Step 3: Update the automation API route to support CRUD**

Read `src/app/api/automation/route.ts`. Add POST handler if missing, and create `src/app/api/automation/[id]/route.ts` for PATCH/DELETE:

```ts
// src/app/api/automation/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  const body = await request.json()
  try {
    const workflow = await prisma.automationWorkflow.update({
      where: { id: params.id, organizationId },
      data: { status: body.status },
    })
    return NextResponse.json({ success: true, workflow })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const organizationId = (session.user as any).organizationId

  try {
    await prisma.automationWorkflow.delete({ where: { id: params.id, organizationId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 })
  }
}
```

Adapt model name to match your Prisma schema.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/automation/page.tsx src/app/api/automation/
git commit -m "feat: rebuild automation page with real workflow CRUD"
```

---

## Task 11: Add Tags and Opt-Outs links to navigation

**Files:**
- Modify: `src/components/header.tsx`

- [ ] **Step 1: Read the header file**

Read `src/components/header.tsx` and find the navigation links array.

- [ ] **Step 2: Add links**

Find the array of nav items. Add:
```tsx
{ href: "/dashboard/tags", label: "Tags" },
{ href: "/dashboard/optouts", label: "Opt-Outs" },
```

These should go under a "Contacts" group or in a secondary dropdown to avoid cluttering the main nav.

If the header has a user dropdown or a secondary "more" menu, add them there instead of the main top-level nav.

- [ ] **Step 3: Commit**

```bash
git add src/components/header.tsx
git commit -m "feat: add Tags and Opt-Outs to navigation"
```

---

## Self-Review Checklist

- [x] Segment rule builder: field select, operator select, value input, AND/OR logic
- [x] Segment builder dialog: name + rules + save (POST) + edit (PUT)
- [x] Segments page uses the full builder dialog for create and edit
- [x] PUT/DELETE endpoints for segments/[id] exist
- [x] Onboarding wizard: 4 steps, fires once for new users, dismissible
- [x] Wizard mounted in dashboard layout
- [x] Contact activity timeline: fetches messages for contact, shows in drawer
- [x] Activity API endpoint: `/api/contacts/[id]/activity`
- [x] Tags page: shows all tags with count, delete tag removes from all contacts
- [x] Tags API: GET (aggregate) + DELETE (remove from all contacts)
- [x] Opt-out page: list opted-out contacts, re-opt-in action
- [x] Opt-out API: GET (filtered list) + PATCH (reinstate)
- [x] Automation page: real workflow list, create dialog, pause/activate/delete
- [x] Automation [id] route: PATCH status + DELETE
- [x] Tags and Opt-Outs linked in navigation
