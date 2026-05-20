# Exhibition Management SaaS — Roadmap After MVP

## 1. Purpose

This document describes the development roadmap after the MVP.

The MVP is focused on internal operations:

- companies;
- contacts;
- participations;
- booths;
- brands;
- logistics statuses;
- SMM workflow;
- internal tasks;
- dashboards.

The next phases should turn the internal system into a full Exhibition Management SaaS platform.

---

## 2. Product vision

The long-term product is an operations platform for exhibition organizers.

It should combine:

- CRM for exhibitor sales;
- exhibitor management;
- exhibitor portal;
- booth/floor plan management;
- service requests;
- supplier/venue coordination;
- marketing operations;
- sponsorship deliverables;
- visitor matchmaking;
- lead retrieval;
- analytics;
- integrations with email, ticketing, payment and event platforms.

Possible positioning:

```text
Exhibition CRM & Exhibitor Operations Platform
```

or:

```text
Event Exhibitor Management SaaS
```

---

## 3. Phase 2 — Sales CRM and pipeline

### Goal

Add proper lead-to-exhibitor flow.

### Main features

- leads;
- deals;
- pipeline stages;
- kanban board;
- follow-up tasks;
- sales owner;
- deal value;
- probability;
- lost/won reasons;
- sales notes;
- commercial offer tracking.

### New entities

```text
leads
deals
deal_stages
commercial_offers
sales_activities
```

### Example pipeline

```text
New lead
Contacted
Qualified
Proposal sent
Negotiation
Soft booked
Confirmed
Lost
```

### Important rule

A lead/deal is not the same as participation.

A deal becomes participation only when the company is confirmed or soft-booked for a specific event.

---

## 4. Phase 3 — Exhibitor Portal

### Goal

Allow participants to manage their own information and requests.

### Portal users

Participants should log in using magic link or email invitation.

### Main features

Participant can:

- view event information;
- view booth number/package;
- update company description;
- upload logo;
- upload marketing materials;
- add social media links;
- add represented brands;
- submit staff badge list;
- submit extra service requests;
- download exhibitor manual;
- download rules and deadlines;
- submit documents;
- see status of submitted materials and requests.

### New entities

```text
portal_users
participant_invitations
badge_requests
uploaded_documents
portal_notifications
```

### Recommended portal sections

```text
Dashboard
Company profile
Brands & products
Marketing materials
Badges / staff
Extra services
Documents & rules
Deadlines
Messages / notifications
```

### Important rule

Participant users must only see their own participation data.

Supabase RLS should strictly enforce this.

---

## 5. Phase 4 — Service Requests and Extra Orders

### Goal

Turn participant requests into structured operational and commercial workflows.

### Main features

- service catalog;
- participant request form;
- internal approval;
- price calculation;
- invoice trigger;
- supplier order creation;
- status tracking;
- export to venue/supplier.

### Service examples

```text
Electricity
Internet
Furniture
Extra badges
Stand cleaning
Printing
AV equipment
Meeting room
Speaking slot
Extra branding
Logistics support
```

### New entities

```text
service_catalog
service_requests
service_request_items
service_prices
supplier_order_items
```

### Status flow

```text
requested
under_review
approved
rejected
quoted
invoiced
paid
sent_to_supplier
confirmed_by_supplier
completed
```

---

## 6. Phase 5 — Supplier and Venue Operations

### Goal

Coordinate venue, contractors and suppliers from inside the platform.

### Main features

- supplier database;
- venue submission lists;
- grouped supplier orders;
- contractor deadlines;
- export by category;
- task assignment;
- supplier status tracking.

### New entities

```text
suppliers
supplier_contacts
supplier_orders
venue_submissions
contractor_tasks
submission_batches
```

### Example workflows

```text
All electricity requests → Venue electricity submission
All fascia names → Stand contractor submission
All furniture requests → Furniture supplier order
All badge requests → Registration/ticketing provider
All printing files → Printing contractor
```

---

## 7. Phase 6 — Finance and Sponsorship

### Goal

Add financial control and sponsor deliverables.

### Finance features

- invoices;
- invoice items;
- payments;
- outstanding balances;
- payment terms;
- discounts;
- extra service charges;
- revenue dashboard.

### Sponsorship features

- sponsorship packages;
- sponsor benefits;
- deliverables tracking;
- sponsor logo placement;
- speaking slots;
- newsletter mentions;
- social media posts;
- onsite branding tasks.

### New entities

```text
invoices
invoice_items
payments
payment_terms
sponsorship_packages
sponsor_benefits
sponsor_deliverables
```

### Sponsor deliverable status

```text
not_started
materials_needed
in_progress
scheduled
delivered
cancelled
```

---

## 8. Phase 7 — Public Website Sync

### Goal

Sync approved exhibitor content to the public event website.

### Main features

- approved exhibitor profiles;
- approved logos;
- booth numbers;
- brands;
- categories;
- speaker profiles;
- sponsor logos;
- event program;
- website publish status.

### Integration options

Option A:

```text
Supabase → frontend static/data build
```

Option B:

```text
Supabase → Strapi sync → website consumes Strapi
```

Option C:

```text
Supabase API → website frontend directly
```

Recommended for current stack:

```text
Supabase operational source of truth
Approved public data synced to Strapi or generated JSON
Public website consumes only approved data
```

### Important rule

Internal CRM data and public website data must remain separated.

Only approved public fields should be published.

---

## 9. Phase 8 — Visitor Management and Matchmaking

### Goal

Connect visitors with exhibitors and create measurable business value.

### Main features

- visitor registrations;
- visitor interests;
- visitor company profile;
- recommended exhibitors;
- meeting requests;
- meeting slots;
- exhibitor acceptance/rejection;
- visitor agenda;
- exhibitor lead list;
- post-show follow-up.

### New entities

```text
visitors
visitor_interests
product_categories
exhibitor_categories
meeting_requests
meeting_slots
recommendations
```

### Matching logic v1

Simple category matching:

```text
Visitor interests
  ↔ Exhibitor categories
  ↔ Brands/products shown
```

### Matching logic v2

Weighted scoring:

```text
category match
company profile match
visitor role
visit purpose
selected seminars
previous interaction
booth priority/sponsor priority
```

### Important rule

Do not start with AI matchmaking.

Start with clean categories and deterministic matching logic first.

---

## 10. Phase 9 — Lead Retrieval and Ticketing Integration

### Goal

Allow exhibitors to collect and access visitor leads.

### Main features

- QR/badge scanning;
- visitor consent;
- exhibitor lead list;
- notes on scanned leads;
- export CSV;
- post-show access rules;
- integration with ticketing provider.

### Possible Tahfiz integration

The platform may sync visitor and badge data with Tahfiz or another ticketing/access-control provider.

Recommended rule:

```text
Before the event: Supabase is the operational source of truth.
During the event: ticketing/access-control provider is the operational authority for QR/access control.
After the event: sync attendance and scan data back to Supabase.
```

### New entities

```text
ticketing_sync_logs
badges
lead_scans
exhibitor_leads
attendance_logs
```

---

## 11. Phase 10 — Communications and Automations

### Goal

Automate repetitive communication and reminders.

### Main features

- email templates;
- automated reminders;
- campaign history;
- recipient segmentation;
- missing material reminders;
- payment reminders;
- deadline reminders;
- task notifications;
- internal Telegram alerts;
- Brevo integration;
- n8n workflows.

### New entities

```text
email_templates
campaigns
campaign_recipients
message_logs
notification_rules
automation_runs
```

### Example automations

```text
If logo missing 14 days before deadline → send reminder
If payment overdue → notify event manager
If SMM post published → update participation SMM status
If badge list submitted → create logistics task
If service request approved → create supplier order item
```

---

## 12. Phase 11 — Advanced Floor Plan

### Goal

Move from simple booth inventory to visual floor plan management.

### Features

- upload floor plan image/PDF;
- define clickable booth areas;
- booth status colors;
- drag-and-drop assignment;
- booth details panel;
- public floor plan view;
- exhibitor search by booth;
- categories/zones.

### New entities

```text
floor_plans
floor_plan_layers
booth_coordinates
floor_plan_public_settings
```

### MVP-friendly approach

Do not build this first.

Start with booth inventory table and PDF link. Add visual editor only after core operations are stable.

---

## 13. Phase 12 — SaaS Commercialization

### Goal

Turn the internal platform into a product for other organizers.

### Required features

- organization onboarding;
- plans and subscriptions;
- usage limits;
- billing;
- team invitations;
- event templates;
- custom branding;
- custom domains or subdomains;
- audit logs;
- export/import tools (see §18 — CSV Import Wizard with Logo URL Ingestion to R2);
- support/admin console.

### SaaS entities

```text
plans
subscriptions
usage_limits
organization_settings
branding_settings
domain_settings
team_invitations
```

### Possible pricing dimensions

```text
Number of events
Number of exhibitors
Number of team users
Exhibitor portal enabled/disabled
Matchmaking enabled/disabled
Lead retrieval enabled/disabled
White-label branding
```

---

## 14. Technical roadmap

### Foundation

- Supabase Postgres;
- Supabase Auth;
- Supabase Storage;
- Row Level Security;
- React frontend;
- API/business logic layer where needed;
- deployment on Netlify/Vercel;
- GitHub-based workflow.

### Later backend additions

- Supabase Edge Functions or separate backend;
- background jobs;
- scheduled tasks;
- webhooks;
- integration queues;
- error logging;
- monitoring.

### Recommended integration approach

Do not put complex business logic directly in the frontend.

Use backend functions for:

- ticketing provider sync;
- email sending;
- invoice generation;
- file processing;
- webhook handling;
- automation triggers;
- sensitive operations.

---

## 15. Suggested implementation sequence after MVP

Recommended order:

1. Sales CRM pipeline.
2. Exhibitor portal.
3. Service requests.
4. Supplier/venue operations.
5. Public website sync.
6. Finance/sponsorship module.
7. Communications/automations.
8. Visitor management.
9. Matchmaking.
10. Lead retrieval.
11. Advanced floor plan.
12. SaaS billing and commercialization.

This order keeps operational value high while avoiding premature complexity.

---

## 16. Product risks

### Risk 1 — Building too much too early

Avoid building all modules at once.

Start with internal operations and stable data model.

### Risk 2 — Weak permissions model

SaaS requires proper multi-tenancy and RLS from day one.

### Risk 3 — Confusing company with participation

This is the most important data-model mistake to avoid.

Company is permanent. Participation is event-specific.

### Risk 4 — Boolean statuses

Operational workflows need multi-stage statuses, not true/false fields.

### Risk 5 — Public data mixed with internal data

Public website content must be approved and separated from internal CRM/operations data.

---

## 17. Long-term vision

The final product should allow an exhibition organizer to manage the full lifecycle:

```text
Lead
→ Deal
→ Booking
→ Exhibitor onboarding
→ Booth assignment
→ Materials collection
→ Marketing promotion
→ Service requests
→ Venue/supplier coordination
→ Badges and documents
→ Visitor matchmaking
→ Lead retrieval
→ Post-show reporting
→ Renewal for next year
```

This creates a defensible niche product because generic CRMs do not handle exhibition-specific operations well.

---

## 18. Future SaaS onboarding — CSV Import Wizard with Logo URL Ingestion to R2

> **Status:** Future feature — not part of the current immediate MVP.  
> **Purpose:** Onboard a new organizer/event by bulk-importing exhibitors from CSV/XLSX, with optional logo URL ingestion into Cloudflare R2.

### 18.1 Product context

The Exhibition CRM already has:

- organizations / events / companies / participations model;
- `public.files` as canonical file metadata;
- Cloudflare R2 as the physical storage backend;
- logo roles: `file_category='logo'`, `file_role` in `full`, `thumb`, `full_inverted`, `thumb_inverted`;
- R2 path convention: `organizations/{organization_slug}/...`;
- legacy URL fallback logic;
- existing AppSheet/local data import history (e.g. HESHS2026).

This wizard is the **self-service SaaS onboarding path** for a new CRM user / exhibition organizer: create an event, upload a CSV, map columns, preview, apply import, and optionally copy logo URLs to R2.

### 18.2 User scenario

A new organizer:

1. Creates or selects an event under their organization.
2. Uploads a CSV (or XLSX) through the UI.
3. Maps CSV columns to CRM fields.
4. Reviews a dry-run preview.
5. Confirms import; backend creates/updates companies and participations and ingests logos to R2.

**Example CSV columns:**

| CSV column | Typical CRM mapping |
|---|---|
| Company Name | `company_name` (required) |
| Legal Name | `legal_name` |
| Website | `website` |
| Country | `country` |
| City | `city` |
| Description | `description` |
| Logo URL | `logo_url` |
| Facebook / Instagram / LinkedIn / YouTube | social links |
| Booth Number | `booth_number` |
| Contact Name / Email / Phone | contacts |
| Brand Names | brands (multi-value) |

### 18.3 Recommended workflow

#### Step 1 — Upload CSV/XLSX

- User chooses target **organization** and **event**.
- User uploads CSV/XLSX.
- System parses headers and sample rows for mapping UI.

#### Step 2 — Field mapping UI

- User maps CSV columns to CRM fields.
- **Required mapping:** `company_name`.
- **Optional mappings:** `website`, `country`, `city`, `description`, `logo_url`, social links, `booth_number`, contacts, brands.
- Future: save mapping templates per organization.

#### Step 3 — Dry-run preview

Before any writes, show:

- total row count;
- companies to create vs update;
- participations to create;
- booths to create/assign;
- logo URLs detected;
- duplicate candidates (normalized name, website, optional external ID);
- invalid rows;
- downloadable error preview (CSV/JSON).

#### Step 4 — Apply import

Scoped to selected **organization** and **event**:

- create/update **companies** under the organization (persistent entity);
- create **participations** for the selected event (company-in-event — not the same as company);
- create/link **contacts** if mapped;
- create/link **brands** if mapped;
- create **booths** and **booth_assignments** if booth column is mapped;
- remain **idempotent** using normalized company name, website, and/or optional external ID column.

**Critical data-model rule:**

```text
Company     = persistent under organization
Participation = company-in-event (one per company per event)
```

Do not treat a CSV row as “a participation only” without resolving/creating the underlying company.

#### Step 5 — Logo ingestion to R2

For each row with a mapped `logo_url`:

1. Download image from URL.
2. Validate HTTP 200.
3. Validate `Content-Type` starts with `image/`.
4. Validate max size (align with existing copy script limits, e.g. 10 MB).
5. Upload original to R2:
   - `file_category='logo'`
   - `file_role='full'`
   - `provider='cloudflare_r2'`
   - path: `organizations/{organization_slug}/companies/{company_id}/logos/full/...`
6. For PNG/JPEG/WebP, generate thumbnail:
   - `file_role='thumb'`
7. Insert `public.files` rows (canonical metadata).
8. Set `companies.primary_logo_file_id` to **thumb** if generated, otherwise **full**.
9. Optionally mirror primary public URL into `companies.company_logo_url` for legacy compatibility.
10. Log per-row logo failures **without failing the whole import**.

**Do not auto-generate inverted logos.** Inverted logos (`full_inverted`, `thumb_inverted`) are uploaded separately by the user later.

Reuse patterns from `scripts/copy-legacy-logos-to-r2.mjs` where applicable (download validation, thumb generation, idempotency).

#### Step 6 — Import reporting

After import, show:

- created / updated companies;
- created participations;
- created booths;
- imported logos;
- failed logo downloads;
- skipped duplicates;
- row-level errors;
- downloadable CSV/JSON error report.

#### Step 7 — Retry mechanism (future version)

- retry failed logo downloads only;
- retry failed rows only;
- re-run import with same saved mapping;
- saved mapping templates per organization.

### 18.4 Canonical files and legacy mirrors

| Layer | Role |
|---|---|
| `public.files` | Canonical file metadata (source of truth) |
| Cloudflare R2 | Physical object storage |
| `companies.company_logo_url` | Compatibility mirror only |
| `companies.primary_logo_file_id` | Preferred display pointer (thumb when available) |

Legacy URL fields must not replace `public.files` for new imports.

### 18.5 Recommended database tables (future)

#### `import_jobs`

| Field | Type / notes |
|---|---|
| `id` | uuid PK |
| `organization_id` | uuid FK — tenant scope |
| `event_id` | uuid FK — target event |
| `created_by` | uuid — profile/user |
| `source_filename` | text |
| `import_type` | text — e.g. `csv_exhibitors` |
| `status` | text — `draft`, `preview_ready`, `running`, `completed`, `failed`, `cancelled` |
| `mapping` | jsonb — column → field map |
| `summary` | jsonb — counts, errors aggregate |
| `created_at` | timestamptz |
| `started_at` | timestamptz |
| `completed_at` | timestamptz |

#### `import_job_rows`

| Field | Type / notes |
|---|---|
| `id` | uuid PK |
| `import_job_id` | uuid FK |
| `row_number` | int |
| `raw_data` | jsonb — original CSV row |
| `normalized_data` | jsonb — parsed/normalized values |
| `status` | text — `pending`, `preview_ok`, `preview_error`, `imported`, `failed`, `skipped` |
| `error_message` | text |
| `company_id` | uuid — result link |
| `participation_id` | uuid — result link |
| `logo_file_id` | uuid — resulting thumb/full file |
| `created_at` | timestamptz |

### 18.6 Implementation phases

| Phase | Scope |
|---|---|
| **A** | `import_jobs` / `import_job_rows` schema; backend CSV parser; dry-run engine |
| **B** | Mapping UI; import preview UI; saved mapping templates |
| **C** | Apply import: companies, participations, booths, contacts, brands |
| **D** | Logo URL ingestion to R2; thumbnail generation; import report |
| **E** | Retry failed rows/logos; background job processing; notification on completion |

### 18.7 Placement in overall roadmap

This feature belongs under **Phase 12 — SaaS Commercialization** (organization onboarding, export/import tools). It should ship after core MVP operations and file upload APIs are stable. It complements — but does not replace — one-off migration scripts like `copy-legacy-logos-to-r2.mjs` for historical data.
