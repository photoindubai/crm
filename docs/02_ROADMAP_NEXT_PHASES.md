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
- export/import tools;
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
