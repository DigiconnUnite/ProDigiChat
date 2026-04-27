# Contact Module Phase 3: Schema and API Contract Draft

Date: 2026-04-07
Status: Draft for implementation planning

## Goals

- Make contacts the single source of truth for identity, consent, and engagement.
- Support high-volume imports, segmentation, and campaign delivery safely.
- Enforce tenant isolation and compliance workflows by design.

## Proposed Schema Changes

### 1) Contact (core)

Current model keeps several JSON fields as strings. Phase 3 proposes explicit, typed fields and history tables.

Proposed fields:

- id: string (ObjectId)
- organizationId: string (ObjectId, required, indexed)
- ownerUserId: string (ObjectId, optional)
- firstName: string
- lastName: string
- displayName: string (computed/fallback)
- primaryPhone: string (normalized canonical format)
- phoneHash: string (for dedupe and privacy-safe lookup)
- alternatePhones: string[] (optional)
- email: string
- lifecycleStatus: enum
  - lead
  - active
  - suppressed
  - blocked
  - bounced
- optInStatus: enum
  - opted_in
  - opted_out
  - pending
- optInAt: datetime (nullable)
- optOutAt: datetime (nullable)
- optInSource: string (nullable)
- optInProofRef: string (nullable)
- lastContactedAt: datetime (nullable)
- lastInboundAt: datetime (nullable)
- lastOutboundAt: datetime (nullable)
- tags: string[]
- customAttributes: object/json
- source: string (csv, api, webhook, manual)
- sourceRef: string (nullable)
- isDeleted: boolean (soft delete)
- deletedAt: datetime (nullable)
- createdAt: datetime
- updatedAt: datetime

Indexes:

- unique(organizationId, primaryPhone)
- index(organizationId, lifecycleStatus)
- index(organizationId, optInStatus)
- index(organizationId, updatedAt)
- index(organizationId, lastContactedAt)

### 2) ContactConsentEvent (new)

Immutable event log of opt-in and opt-out transitions.

Fields:

- id
- organizationId
- contactId
- eventType: enum (opt_in, opt_out, consent_updated)
- channel: enum (whatsapp, webform, api, import, admin)
- source: string
- legalBasis: string
- evidenceRef: string
- metadata: object/json
- occurredAt
- createdByUserId (nullable)

Indexes:

- index(organizationId, contactId, occurredAt)
- index(organizationId, eventType, occurredAt)

### 3) ContactActivityEvent (new)

Timeline events for engagement and operational actions.

Fields:

- id
- organizationId
- contactId
- eventType: enum
  - message_sent
  - message_delivered
  - message_read
  - message_failed
  - inbound_message
  - tag_added
  - tag_removed
  - merged
  - imported
  - exported
- messageId (nullable)
- campaignId (nullable)
- payload: object/json
- occurredAt
- createdAt

Indexes:

- index(organizationId, contactId, occurredAt)
- index(organizationId, eventType, occurredAt)

### 4) ContactMergeAudit (new)

Records duplicate merge operations.

Fields:

- id
- organizationId
- winnerContactId
- mergedContactId
- mergeStrategy: string
- beforeSnapshot: object/json
- afterSnapshot: object/json
- mergedByUserId
- mergedAt

### 5) Segment Rule Structures (enhancement)

Keep Segment model but enforce typed rule groups:

- ruleGroups: array of groups
- each group has logic: AND/OR
- each rule has field, operator, value

Example operators:

- equals, not_equals
- in, not_in
- contains, not_contains
- greater_than, less_than
- date_before, date_after

## API Contract (v1 -> v2 evolution)

### Contact API

#### GET /api/contacts

Query:

- page: number (default 1)
- limit: number (1-100)
- search: string
- status: opted_in | opted_out | pending | all
- lifecycleStatus: lead | active | suppressed | blocked | bounced
- tag: repeatable or comma-separated
- sortBy: createdAt | updatedAt | firstName | primaryPhone | lastContactedAt
- sortOrder: asc | desc

Response:

- success: boolean
- data: ContactSummary[]
- pagination: { page, limit, total, totalPages }
- stats: { total, optedIn, optedOut, pending, active, suppressed }

#### POST /api/contacts

Request body:

- firstName, lastName
- phoneNumber (raw; server normalizes)
- email
- tags: string[]
- customAttributes: object
- optInStatus
- optInSource (optional)

Response:

- success
- data: ContactDetail
- warnings: string[] (optional)

#### PUT /api/contacts/:id

Request body:

- mutable fields above
- expectedVersion (for optimistic concurrency)

Response:

- success
- data: ContactDetail

#### DELETE /api/contacts/:id

Behavior:

- soft delete by default
- hard delete only for privileged role + explicit query flag

Response:

- success
- deletedAt

### Bulk Import API

#### POST /api/contacts/import

Multipart:

- file
- defaultOptInStatus
- defaultTags[]
- dryRun: boolean

Behavior:

- validates and normalizes all rows
- dedupes in-file and against existing contacts
- supports dry run summary

Response:

- success
- summary:
  - totalRows
  - validRows
  - imported
  - skipped
  - duplicatesInFile
  - duplicatesExisting
  - invalidRows
- errors: array of { rowNumber, code, message }
- importJobId (for large async imports)

### Export API

#### GET /api/contacts/export

Query mirrors GET contacts filters.

Behavior:

- returns csv stream for filtered dataset
- supports server cap and paging cursor for very large exports

Response:

- text/csv

### Contact Timeline API

#### GET /api/contacts/:id/timeline

Response:

- success
- data: ContactActivityEvent[]
- cursor for pagination

### Consent API

#### POST /api/contacts/:id/consent

Request body:

- action: opt_in | opt_out | update
- source
- legalBasis
- evidenceRef
- metadata

Response:

- success
- currentConsent
- eventId

### Merge API

#### POST /api/contacts/merge

Request body:

- winnerContactId
- mergedContactId
- mergeStrategy

Response:

- success
- data: merged contact
- auditId

## RBAC and Security Contract

- Read contacts: member+
- Create contacts: member+
- Import/export contacts: member+
- Update contact identity/consent: manager+
- Merge contacts and hard delete: admin+

Enforcement:

- Every endpoint requires both userId and organizationId from JWT.
- No client-provided organizationId is trusted.

## Validation Rules

- Phone must be normalized before dedupe checks.
- Email validated when provided.
- Tags max count per contact (recommended 50).
- Custom attributes max keys (recommended 100).
- Request and response payload size limits.

## Migration Plan (Draft)

1. Introduce new optional fields and event tables.
2. Backfill displayName, lifecycleStatus, and normalized phone values.
3. Migrate string tags to array representation.
4. Start dual-write for consent and activity events.
5. Switch reads to new fields.
6. Remove legacy string-only field assumptions after verification.

## Open Questions

- Final phone normalization library choice and regional parsing behavior.
- Hard vs soft delete default policy for compliance.
- Maximum import row limits for synchronous execution.
- Whether to expose async import job status endpoint in Phase 3 or later.
