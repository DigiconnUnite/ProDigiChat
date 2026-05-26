# Sprint 1: Fix the Broken — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every visible UX failure — empty states, error states, silent zero-metrics, breadcrumb bugs, inconsistent skeletons, missing toast confirmations, and inline form validation — so the platform looks production-ready to a new user on day one.

**Architecture:** All changes are UI-layer only (no backend changes). We add a shared `<EmptyState>` component, wire error retry patterns consistently across all list pages, add Zod-based inline validation to all forms, and standardise the badge/skeleton system.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Zod (already installed), Sonner (already installed), Lucide React

---

## File Map

| Action | File |
|--------|------|
| Create | `src/components/ui/empty-state.tsx` |
| Create | `src/components/ui/page-error.tsx` |
| Modify | `src/app/dashboard/campaigns/page.tsx` |
| Modify | `src/app/dashboard/contacts/page.tsx` |
| Modify | `src/app/dashboard/templates/page.tsx` |
| Modify | `src/app/dashboard/segments/page.tsx` |
| Modify | `src/app/dashboard/automation/page.tsx` |
| Modify | `src/app/dashboard/inbox/page.tsx` |
| Modify | `src/app/dashboard/analytics/page.tsx` |
| Modify | `src/app/dashboard/campaigns/[id]/page.tsx` |
| Modify | `src/components/contacts/contact-form-dialog.tsx` |
| Modify | `src/components/contacts/import-contacts-dialog.tsx` |
| Modify | `src/components/templates/template-wizard.tsx` |
| Modify | `src/components/dashboard-breadcrumb.tsx` |

---

## Task 1: Shared `<EmptyState>` component

**Files:**
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/empty-state.tsx
import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        <div className="flex items-center gap-3">
          <Button onClick={action.onClick} className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
            {action.label}
          </Button>
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick} className="rounded-lg">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/empty-state.tsx
git commit -m "feat: add shared EmptyState component"
```

---

## Task 2: Shared `<PageError>` component

**Files:**
- Create: `src/components/ui/page-error.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/page-error.tsx
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageErrorProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function PageError({
  title = "Something went wrong",
  message,
  onRetry,
}: PageErrorProps) {
  return (
    <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">{title}</p>
          <p className="text-xs text-red-700 mt-0.5">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="rounded-lg border-red-300 text-red-700 hover:bg-red-100 text-xs flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/page-error.tsx
git commit -m "feat: add shared PageError component"
```

---

## Task 3: Campaigns page — empty state + error state

**Files:**
- Modify: `src/app/dashboard/campaigns/page.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/dashboard/campaigns/page.tsx` fully to find the table render section and the error/loading state handling.

- [ ] **Step 2: Add imports at the top of the file**

Find the existing import block and add:
```tsx
import { EmptyState } from "@/components/ui/empty-state"
import { PageError } from "@/components/ui/page-error"
```

- [ ] **Step 3: Replace the empty-table body with EmptyState**

Find the section where `campaigns.length === 0` is checked (inside the table body or surrounding it) and replace with:

```tsx
{!isLoading && error && (
  <PageError
    message={error}
    onRetry={fetchCampaigns}
  />
)}

{!isLoading && !error && campaigns.length === 0 && (
  <EmptyState
    icon={Send}
    title="No campaigns yet"
    description="Send your first WhatsApp campaign and start reaching your audience."
    action={{
      label: "Create Campaign",
      onClick: () => router.push("/dashboard/campaigns/new"),
    }}
  />
)}
```

Where `Send` is already imported from lucide-react and `fetchCampaigns` is the existing data-fetching function.

- [ ] **Step 4: Verify delete toast fires on failure**

Find the delete handler. After the `catch` block, ensure there is:
```tsx
toast.error("Failed to delete campaign. Please try again.")
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/campaigns/page.tsx
git commit -m "fix: add empty state and error state to campaigns page"
```

---

## Task 4: Contacts page — empty state + error state

**Files:**
- Modify: `src/app/dashboard/contacts/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state"
import { PageError } from "@/components/ui/page-error"
```

- [ ] **Step 2: Add error state rendering above the table**

Find where `isLoading` is checked and the table rendered. Before the table, insert:

```tsx
{error && (
  <PageError
    message={error}
    onRetry={fetchContacts}
  />
)}
```

- [ ] **Step 3: Replace empty table body with EmptyState**

Find the condition where `contacts.length === 0` (or where no rows render). Replace with:

```tsx
{!isLoading && !error && contacts.length === 0 && (
  <EmptyState
    icon={Users}
    title={searchQuery || statusFilter !== "all" ? "No contacts match your filters" : "No contacts yet"}
    description={
      searchQuery || statusFilter !== "all"
        ? "Try adjusting your search or filters."
        : "Import your contacts or add them one by one to get started."
    }
    action={
      !searchQuery && statusFilter === "all"
        ? { label: "Add Contact", onClick: () => setShowCreateDialog(true) }
        : undefined
    }
    secondaryAction={
      !searchQuery && statusFilter === "all"
        ? { label: "Import CSV", onClick: () => setShowImportDialog(true) }
        : undefined
    }
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/contacts/page.tsx
git commit -m "fix: add empty state and error state to contacts page"
```

---

## Task 5: Templates page — empty state + error state

**Files:**
- Modify: `src/components/templates/template-management.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state"
import { PageError } from "@/components/ui/page-error"
```

- [ ] **Step 2: Add error + empty state rendering**

Find where templates list renders. Add before/instead of empty table rows:

```tsx
{error && (
  <PageError message={error} onRetry={fetchTemplates} />
)}

{!isLoading && !error && filteredTemplates.length === 0 && (
  <EmptyState
    icon={FileText}
    title={searchQuery ? "No templates match your search" : "No templates yet"}
    description={
      searchQuery
        ? "Try a different search term."
        : "Create a WhatsApp message template to start sending campaigns."
    }
    action={
      !searchQuery
        ? { label: "Create Template", onClick: () => setShowCreateDialog(true) }
        : undefined
    }
    secondaryAction={
      !searchQuery
        ? { label: "Sync from Meta", onClick: handleSyncFromMeta }
        : undefined
    }
  />
)}
```

Add `import { FileText } from "lucide-react"` to the lucide imports if not already present.

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/template-management.tsx
git commit -m "fix: add empty state and error state to templates page"
```

---

## Task 6: Segments page — empty state + skeleton

**Files:**
- Modify: `src/app/dashboard/segments/page.tsx`

- [ ] **Step 1: Add skeleton loader import**

```tsx
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { PageError } from "@/components/ui/page-error"
```

- [ ] **Step 2: Add error state to component state**

Find the state declarations and add:
```tsx
const [error, setError] = useState<string | null>(null)
```

- [ ] **Step 3: Update fetchSegments to set error state**

Find `fetchSegments`. Replace the catch block:
```tsx
} catch (error) {
  console.error('Error fetching segments:', error)
  setError('Failed to load segments. Please try again.')
} finally {
  setIsLoading(false)
}
```

And reset error at the start:
```tsx
const fetchSegments = async () => {
  try {
    setIsLoading(true)
    setError(null)
    // ... rest of existing code
```

- [ ] **Step 4: Replace loading spinner with proper skeleton**

Find the `isLoading` block that renders `<div className="text-muted-foreground">Loading segments...</div>` and replace:

```tsx
{isLoading ? (
  <div className="space-y-3 p-4">
    {[1,2,3].map(i => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-8 ml-auto" />
      </div>
    ))}
  </div>
) : error ? (
  <PageError message={error} onRetry={fetchSegments} />
) : filteredSegments.length === 0 ? (
  <EmptyState
    icon={Users}
    title={searchQuery ? "No segments match your search" : "No segments yet"}
    description={
      searchQuery
        ? "Try a different search term."
        : "Create a segment to group contacts for targeted campaigns."
    }
    action={
      !searchQuery
        ? { label: "Create Segment", onClick: () => setShowCreateDialog(true) }
        : undefined
    }
  />
) : (
  <Table>
    {/* existing table */}
  </Table>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/segments/page.tsx
git commit -m "fix: add skeleton, empty state, and error state to segments page"
```

---

## Task 7: Automation page — meaningful empty state

**Files:**
- Modify: `src/app/dashboard/automation/page.tsx`

- [ ] **Step 1: Replace the "Coming Soon" card with a proper empty state**

Find the `<Card className="border-dashed">` block (lines 82-92) and replace the entire Card with:

```tsx
<div className="rounded-xl border-2 border-dashed border-green-200 bg-green-50/30 p-12 text-center">
  <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
    <Zap className="h-8 w-8 text-green-600" />
  </div>
  <h3 className="text-xl font-semibold text-foreground mb-2">
    Build your first automation
  </h3>
  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
    Automatically send welcome messages, follow-ups, and re-engagement campaigns based on contact actions.
  </p>
  <div className="flex items-center justify-center gap-3">
    <Button
      className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2"
      onClick={() => setIsCanvasOpen(true)}
    >
      <Plus className="h-4 w-4" />
      New Workflow
    </Button>
  </div>
  <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
    {[
      { icon: UserPlus, label: "New contact joins", desc: "Trigger on contact creation" },
      { icon: MessageSquare, label: "Reply received", desc: "Trigger on inbound message" },
      { icon: Timer, label: "Scheduled delay", desc: "Wait N days then send" },
    ].map(({ icon: Icon, label, desc }) => (
      <div key={label} className="rounded-lg border border-green-200 bg-white p-3 text-left">
        <Icon className="h-5 w-5 text-green-600 mb-2" />
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Remove the second Card (the table) since it has zero rows and looks broken**

Delete the entire `<Card>` block that renders `<ScrollArea className="h-[600px]">` with the empty `automationWorkflowsData.map(...)` — it will never render rows and just adds empty table headers. It will come back in Sprint 2 when automation is real.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/automation/page.tsx
git commit -m "fix: replace automation Coming Soon with proper empty state"
```

---

## Task 8: Campaign detail breadcrumb — show name not ID

**Files:**
- Modify: `src/app/dashboard/campaigns/[id]/page.tsx`
- Modify: `src/components/dashboard-breadcrumb.tsx`

- [ ] **Step 1: Read both files**

Read `src/app/dashboard/campaigns/[id]/page.tsx` (first 60 lines to find the campaign name state) and read `src/components/dashboard-breadcrumb.tsx` fully.

- [ ] **Step 2: Pass campaign name via searchParams or document title**

In `src/app/dashboard/campaigns/[id]/page.tsx`, find where the campaign name is fetched (it should be in the API response). After the campaign data loads, add:

```tsx
useEffect(() => {
  if (campaign?.name) {
    document.title = `${campaign.name} — Campaign Report`
  }
}, [campaign?.name])
```

- [ ] **Step 3: Update the breadcrumb to use campaign name**

In the campaign detail page, find where the breadcrumb is rendered. If it uses a static string or the raw `id` param, replace the last breadcrumb segment with the campaign name:

```tsx
// Find the breadcrumb render section. Replace the last item:
<BreadcrumbItem>
  <BreadcrumbPage>{campaign?.name ?? `Campaign ${params.id.slice(0, 8)}`}</BreadcrumbPage>
</BreadcrumbItem>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/campaigns/[id]/page.tsx
git commit -m "fix: show campaign name in breadcrumb instead of ID"
```

---

## Task 9: Analytics page — error state + empty chart states

**Files:**
- Modify: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/dashboard/analytics/page.tsx` fully to understand the fetch pattern and chart rendering.

- [ ] **Step 2: Add import**

```tsx
import { PageError } from "@/components/ui/page-error"
```

- [ ] **Step 3: Add error rendering**

Find where `isLoading` is checked. Add after the loading block but before the main content:

```tsx
{!isLoading && error && (
  <PageError
    title="Could not load analytics"
    message={error}
    onRetry={fetchAnalytics}
  />
)}
```

- [ ] **Step 4: Add "N/A — not yet implemented" badge replacement**

Find wherever click rate is shown as `"N/A"` text. Replace with a proper badge:

```tsx
<Badge variant="outline" className="text-xs text-muted-foreground border-muted">
  Click tracking coming soon
</Badge>
```

This is honest to the user and doesn't look like broken data.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/analytics/page.tsx
git commit -m "fix: add error state to analytics page, improve N/A display"
```

---

## Task 10: Inbox page — disconnection indicator

**Files:**
- Modify: `src/app/dashboard/inbox/page.tsx`

- [ ] **Step 1: Read the WebSocket setup in the file**

Read `src/app/dashboard/inbox/page.tsx` and find the socket.io connection setup and the `socket.on('disconnect')` / `socket.on('connect_error')` handlers.

- [ ] **Step 2: Add connection state**

Find the component state declarations and add:
```tsx
const [socketConnected, setSocketConnected] = useState(true)
```

- [ ] **Step 3: Wire up disconnect/reconnect handlers**

Find the socket.io event handler setup. Add:
```tsx
socket.on('connect', () => setSocketConnected(true))
socket.on('disconnect', () => setSocketConnected(false))
socket.on('connect_error', () => setSocketConnected(false))
```

- [ ] **Step 4: Add connection banner in the chat window**

Find the chat window JSX (the center panel). At the very top of the chat panel content, add:

```tsx
{!socketConnected && (
  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200">
    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
    <span className="text-xs text-yellow-800">Connection lost — attempting to reconnect…</span>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/inbox/page.tsx
git commit -m "fix: show disconnection indicator in inbox when WebSocket drops"
```

---

## Task 11: Contact form — inline Zod validation

**Files:**
- Modify: `src/components/contacts/contact-form-dialog.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/contacts/contact-form-dialog.tsx` fully.

- [ ] **Step 2: Add Zod schema**

After the imports, add:
```tsx
import { z } from "zod"

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid phone number with country code (e.g. +91xxxxxxxxxx)"),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
})

type ContactFormData = z.infer<typeof contactSchema>
type FormErrors = Partial<Record<keyof ContactFormData, string>>
```

- [ ] **Step 3: Add form error state**

Find the component state declarations. Add:
```tsx
const [formErrors, setFormErrors] = useState<FormErrors>({})
```

- [ ] **Step 4: Validate on change**

Find the input `onChange` handlers for each field. After each `setFormData(...)` call, add inline validation:

```tsx
// Example for phoneNumber field onChange:
onChange={(e) => {
  setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))
  const result = contactSchema.shape.phoneNumber.safeParse(e.target.value)
  setFormErrors(prev => ({
    ...prev,
    phoneNumber: result.success ? undefined : result.error.issues[0].message,
  }))
}}
```

Apply the same pattern for `firstName` and `email`.

- [ ] **Step 5: Show error messages below each field**

After each `<Input>` element, add the error display:

```tsx
{formErrors.firstName && (
  <p className="text-xs text-red-600 mt-1">{formErrors.firstName}</p>
)}
```

Apply same pattern for `phoneNumber` and `email`.

- [ ] **Step 6: Block submit if validation fails**

Find the submit handler. At the top of the handler, add:

```tsx
const validation = contactSchema.safeParse(formData)
if (!validation.success) {
  const errors: FormErrors = {}
  validation.error.issues.forEach(issue => {
    const field = issue.path[0] as keyof ContactFormData
    errors[field] = issue.message
  })
  setFormErrors(errors)
  return
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/contacts/contact-form-dialog.tsx
git commit -m "fix: add inline Zod validation to contact form"
```

---

## Task 12: Template wizard — character count + variable count limit

**Files:**
- Modify: `src/components/templates/template-wizard.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/templates/template-wizard.tsx` and find the body text `<Textarea>` field.

- [ ] **Step 2: Add character counter below body textarea**

Find the `<Textarea>` for the template body. Wrap it in a `<div>` and add after the textarea:

```tsx
<div className="relative">
  <Textarea
    // ... existing props
    maxLength={1024}
  />
  <div className="flex items-center justify-between mt-1">
    <p className={`text-xs ${(formData.body?.length ?? 0) > 960 ? 'text-red-600' : 'text-muted-foreground'}`}>
      {formData.body?.length ?? 0} / 1024 characters
    </p>
    {/* Count {{N}} variable placeholders */}
    <p className="text-xs text-muted-foreground">
      {(formData.body?.match(/\{\{\d+\}\}/g) ?? []).length} variable{(formData.body?.match(/\{\{\d+\}\}/g) ?? []).length !== 1 ? 's' : ''}
    </p>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/template-wizard.tsx
git commit -m "fix: add character count and variable count to template body editor"
```

---

## Task 13: Badge/status color consistency audit

**Files:**
- Modify: `src/app/dashboard/campaigns/page.tsx`
- Modify: `src/app/dashboard/campaigns/[id]/page.tsx`

- [ ] **Step 1: Define a shared status badge utility**

In `src/app/dashboard/campaigns/page.tsx`, find all places where a status badge is rendered for campaigns. The canonical colour mapping is:

| Status | Background | Text |
|--------|-----------|------|
| `running` / `active` | `bg-green-100` | `text-green-800` |
| `scheduled` | `bg-blue-100` | `text-blue-800` |
| `paused` | `bg-yellow-100` | `text-yellow-800` |
| `completed` | `bg-slate-100` | `text-slate-700` |
| `draft` | `bg-gray-100` | `text-gray-700` |
| `failed` | `bg-red-100` | `text-red-800` |

Add a helper function near the top of the file (below imports):

```tsx
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
```

- [ ] **Step 2: Replace all inline Badge colour assignments with this helper**

Search for `<Badge` in the campaigns page and campaign detail page. Replace each one that renders a campaign status with `{getCampaignStatusBadge(campaign.status)}`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/campaigns/page.tsx src/app/dashboard/campaigns/[id]/page.tsx
git commit -m "fix: standardise campaign status badge colours across all campaign views"
```

---

## Task 14: Bulk operation toast confirmations

**Files:**
- Modify: `src/app/dashboard/contacts/page.tsx`
- Modify: `src/app/dashboard/campaigns/page.tsx`

- [ ] **Step 1: Contacts page — ensure all bulk operations toast on success AND failure**

Read the bulk delete handler in contacts page. After a successful bulk delete:
```tsx
toast.success(`${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''} deleted`)
```

After the bulk tag handler success:
```tsx
toast.success(`Tags updated for ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`)
```

After each failure catch block:
```tsx
toast.error("Action failed. Please try again.")
```

- [ ] **Step 2: Campaigns page — same pattern**

Find the bulk actions handler in campaigns page. Add:
```tsx
// bulk delete success:
toast.success(`${count} campaign${count !== 1 ? 's' : ''} deleted`)

// bulk status change success:
toast.success(`${count} campaign${count !== 1 ? 's' : ''} updated`)

// any failure:
toast.error("Bulk action failed. Please try again.")
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/contacts/page.tsx src/app/dashboard/campaigns/page.tsx
git commit -m "fix: add toast confirmations to all bulk operations"
```

---

## Task 15: Dashboard zero-metrics — distinguish "loading" from "truly zero"

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Find where isLoading=false + analyticsData=defaultAnalyticsData (all zeros) is rendered**

The current code silently renders zeros when the API fails (line ~319: `setAnalyticsData(defaultAnalyticsData)`). The fix is to NOT set defaultAnalyticsData on error — leave it as `null` and let the `isLoading` path render skeletons. The `error` state + Retry button already exists.

Find this line:
```tsx
setAnalyticsData(defaultAnalyticsData)
```

Remove it. The error state handles display. When `analyticsData` is null and `isLoading` is false and `error` is set, the PageError renders. When `analyticsData` is null and `isLoading` is false and no error, it means the API returned but data was empty — which is a real "zero" case.

- [ ] **Step 2: Guard the metrics array computation**

Find the `const metrics = analyticsData ? [...] : fallbackMetrics` block (around line 362). Change to:

```tsx
const metrics = analyticsData
  ? [/* existing computed metrics */]
  : null  // null means "don't render metric cards at all"
```

Then in the JSX where metric cards render, change:
```tsx
{isLoading
  ? Array.from({ length: 6 }).map((_, index) => <MetricCardSkeleton key={index} />)
  : metrics
    ? metrics.map((metric, index) => <MetricCard key={index} {...metric} />)
    : null  // error state is rendered above; don't show zeros
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "fix: stop showing zero metrics when analytics API fails — show error instead"
```

---

## Task 16: Verify analytics API returns real data

**Files:**
- Read: `src/app/api/analytics/route.ts`

- [ ] **Step 1: Read the analytics API route**

Read `src/app/api/analytics/route.ts` fully.

- [ ] **Step 2: Confirm it queries the database**

Look for Prisma queries (e.g. `prisma.message.count()`, `prisma.campaign.findMany()`, etc.). If the file returns hardcoded/mock data instead of querying the DB, it needs to be replaced.

If you find hardcoded mock data (e.g. `return NextResponse.json({ success: true, data: { overview: { messagesSent: 1234 } } })`), replace the handler with real Prisma queries:

```ts
// Real implementation skeleton — adapt to actual Prisma schema
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const organizationId = (session.user as any).organizationId
  if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const dateRange = searchParams.get("dateRange") ?? "7d"
  const days = dateRange === "90d" ? 90 : dateRange === "30d" ? 30 : 7
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [totalContacts, messagesSent, activeCampaigns, messageVolume, campaignDetails, recentActivity] =
    await Promise.all([
      prisma.contact.count({ where: { organizationId } }),
      prisma.message.count({ where: { organizationId, createdAt: { gte: since } } }),
      prisma.campaign.count({ where: { organizationId, status: { in: ["running", "active"] } } }),
      // messageVolume: group by date
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date,
               COUNT(*) FILTER (WHERE status != 'failed') as sent,
               COUNT(*) FILTER (WHERE status IN ('delivered','read')) as delivered,
               COUNT(*) FILTER (WHERE status = 'read') as read
        FROM "Message"
        WHERE "organizationId" = ${organizationId}
          AND "createdAt" >= ${since}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      prisma.campaign.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, type: true, status: true, stats: true },
      }),
      prisma.activityLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, action: true, details: true, createdAt: true },
      }),
    ])

  return NextResponse.json({
    success: true,
    data: {
      overview: { totalContacts, messagesSent, activeCampaigns, activeAutomations: 0 },
      performance: { deliveryRate: 0, readRate: 0, dateRange },
      messageVolume,
      campaignDetails: campaignDetails.map(c => {
        const stats = typeof c.stats === "string" ? JSON.parse(c.stats || "{}") : (c.stats ?? {})
        return { id: c.id, name: c.name, type: c.type, status: c.status, ...stats }
      }),
      recentActivity,
      trends: { messagesSent: 0, deliveryRate: 0, readRate: 0, newContacts: 0 },
      contactGrowth: { newContacts: 0, trend: 0 },
    },
  })
}
```

Adapt the Prisma model names to match your actual schema (check `prisma/schema.prisma`).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/analytics/route.ts
git commit -m "fix: analytics API now queries real database instead of returning mock data"
```

---

## Self-Review Checklist

- [x] EmptyState component covers: campaigns, contacts, templates, segments, automation
- [x] PageError component covers: campaigns, contacts, templates, segments, analytics
- [x] All bulk operations have success + failure toasts
- [x] Dashboard no longer shows silent zeros on API failure
- [x] Campaign detail breadcrumb shows name not ID
- [x] Template body has character count
- [x] Contact form has inline validation before submit
- [x] Inbox shows reconnection banner on WebSocket drop
- [x] Badge colours consistent across campaign views
- [x] Analytics API verified as real or replaced
