# Exhibition Management SaaS — MVP Specification

## 1. Product goal

Build the first working version of an Exhibition Management SaaS platform from scratch.

The MVP should initially resemble the current AppSheet model but with a cleaner scalable architecture:

- companies;
- contacts;
- brands;
- participation in a specific exhibition;
- booth / stand numbers;
- exhibitor logistics statuses;
- marketing/SMM workflow;
- internal dashboards for different roles;
- Supabase as the operational database and authentication layer.

The MVP is not yet a full public SaaS product. It should be built as an internal operational platform for one exhibition first, but with the correct foundations for future multi-event and multi-organization SaaS expansion.

---

## 2. Core concept

The central architectural principle is:

```text
Company is not the same as Exhibitor.
Exhibitor = Company participating in a specific Event.
```

Therefore, the core structure is:

```text
Organization
  → Event
    → Participation
      → Company
      → Booth
      → Contacts
      → Brands
      → Logistics
      → SMM tasks
      → Materials
```

For the first version there may be only one organization and one event, but the schema should already support multiple organizations and events.

---

## 3. MVP scope

### Included in MVP

The MVP should include:

1. Supabase project connection.
2. Authentication and role-based access.
3. Internal admin frontend.
4. Companies list and company card.
5. Contacts linked to companies and participations.
6. Brands and brand assignments.
7. Events and participations.
8. Booth / stand number assignment.
9. Basic exhibitor logistics statuses.
10. SMM/content workflow for participant promotion.
11. Internal task system.
12. Dashboard views for different roles.
13. File/material links storage.
14. Basic audit/activity history.

### Not included in MVP

The MVP should not include yet:

- exhibitor self-service portal;
- public SaaS billing/subscriptions;
- advanced floor plan editor;
- visitor matchmaking;
- lead retrieval/scanning;
- WhatsApp integration;
- full invoice/accounting module;
- external supplier portal;
- advanced document signing;
- complex automation rules.

These should be handled in later phases.

---

## 4. User roles

### 4.1 Super Admin

Full access to everything.

Can:

- manage organizations;
- manage events;
- manage users and roles;
- see all companies, contacts, participations and dashboards;
- edit all data;
- view technical/admin settings;
- manage dictionaries and statuses.

This role is for the product owner / system administrator.

---

### 4.2 Event Manager

Responsible for managing one or more exhibitions.

Can:

- see all data for assigned event(s);
- manage companies and participations;
- manage contacts;
- assign booths;
- update booking/logistics/payment/material statuses;
- create and assign tasks;
- see SMM progress;
- see operational dashboards.

Cannot:

- manage global SaaS settings;
- manage organizations outside assigned scope;
- change system-level role definitions.

---

### 4.3 SMM Manager

Responsible for content and social media operations.

Can see and manage only the data needed for publishing and marketing workflow.

Can view:

- company name;
- public description;
- website;
- booth number;
- represented brands;
- logo download link;
- materials download links;
- Facebook URL;
- Instagram URL;
- LinkedIn URL;
- YouTube URL;
- Telegram URL;
- other social links;
- publication tasks;
- publication status;
- links to completed publications;
- notes related to content/SMM.

Can update:

- SMM status;
- content status;
- publication notes;
- publication links;
- assigned SMM tasks;
- material status.

Should not see by default:

- financial data;
- private sales notes;
- payment terms;
- sensitive contact history;
- internal commercial negotiations.

---

### 4.4 Sales Manager — optional for MVP, recommended

May be added in MVP if time allows.

Can:

- manage leads;
- manage companies assigned to them;
- update sales pipeline;
- create follow-up tasks;
- convert lead/deal to participation.

This role can be included structurally even if the UI is basic at first.

---

## 5. Main entities

### 5.1 organizations

Used for future SaaS multi-tenancy.

For MVP there can be one default organization.

Fields:

```text
id uuid primary key
name text not null
slug text unique
created_at timestamptz
updated_at timestamptz
```

---

### 5.2 events

Represents an exhibition/event.

Fields:

```text
id uuid primary key
organization_id uuid references organizations(id)
event_name text not null
event_slug text unique
venue_name text
city text
country text
start_date date
end_date date
build_up_start timestamptz
build_up_end timestamptz
dismantling_start timestamptz
dismantling_end timestamptz
status text
created_at timestamptz
updated_at timestamptz
```

Example:

```text
High End & Smart Home Show 2026
Radisson RED Hotel, Dubai Silicon Oasis
24–26 September 2026
```

---

### 5.3 companies

Represents the company as a persistent organization/entity.

A company can participate in multiple events.

Fields:

```text
id uuid primary key
organization_id uuid references organizations(id)
company_name text not null
legal_name text
website text
description text
country text
city text
company_logo_url text
facebook_url text
instagram_url text
linkedin_url text
youtube_url text
telegram_url text
other_social_url text
created_at timestamptz
updated_at timestamptz
```

Important: booth numbers should not live in companies. Booth assignment belongs to participation.

---

### 5.4 contacts

Represents individual people.

Fields:

```text
id uuid primary key
organization_id uuid references organizations(id)
first_name text
last_name text
email text
phone text
position text
created_at timestamptz
updated_at timestamptz
```

---

### 5.5 company_contacts

Many-to-many relation between companies and contacts.

Fields:

```text
id uuid primary key
company_id uuid references companies(id)
contact_id uuid references contacts(id)
role text
is_primary boolean default false
created_at timestamptz
```

Possible roles:

```text
Decision maker
Sales contact
Marketing contact
Logistics contact
Accounting contact
General contact
```

---

### 5.6 participations

The most important entity.

Represents a company participating in a specific event.

Fields:

```text
id uuid primary key
organization_id uuid references organizations(id)
event_id uuid references events(id)
company_id uuid references companies(id)
participation_type text
status text
package_name text
sales_owner_id uuid references profiles(id)
booking_status text
payment_status text
profile_status text
materials_status text
logistics_status text
smm_status text
internal_notes text
created_at timestamptz
updated_at timestamptz
```

Recommended statuses:

```text
lead
soft_booked
confirmed
contract_sent
contract_signed
invoice_sent
partially_paid
paid
cancelled
lost
```

Participation type examples:

```text
exhibitor
sponsor
partner
speaker
organizer
media_partner
```

---

### 5.7 booths

Represents booth/stand inventory for a specific event.

Fields:

```text
id uuid primary key
event_id uuid references events(id)
booth_number text not null
hall text
zone text
area_sqm numeric
booth_type text
status text
notes text
created_at timestamptz
updated_at timestamptz
```

Statuses:

```text
available
reserved
soft_booked
booked
paid
blocked
organizer_use
```

---

### 5.8 booth_assignments

Allows one participation to have one or several booths.

Fields:

```text
id uuid primary key
participation_id uuid references participations(id)
booth_id uuid references booths(id)
assigned_at timestamptz
notes text
```

---

### 5.9 brands

Represents reusable brands.

Fields:

```text
id uuid primary key
organization_id uuid references organizations(id)
brand_name text not null
brand_description text
brand_logo_url text
website text
country text
created_at timestamptz
updated_at timestamptz
```

---

### 5.10 company_brands

Represents brands associated with a company in general.

Fields:

```text
id uuid primary key
company_id uuid references companies(id)
brand_id uuid references brands(id)
created_at timestamptz
```

---

### 5.11 participation_brands

Represents brands shown by a company at a specific event.

Fields:

```text
id uuid primary key
participation_id uuid references participations(id)
brand_id uuid references brands(id)
display_on_website boolean default true
priority integer
created_at timestamptz
```

This is important because a company may represent many brands but exhibit only some of them at a specific event.

---

### 5.12 participation_logistics

Basic logistics/status table for MVP.

Fields:

```text
id uuid primary key
participation_id uuid references participations(id)
badges_status text
room_asset_status text
check_in_status text
conference_status text
furniture_status text
electricity_status text
internet_status text
stand_design_status text
fascia_status text
notes text
created_at timestamptz
updated_at timestamptz
```

Recommended generic status values:

```text
not_started
waiting_for_exhibitor
waiting_for_organizer
submitted
approved
rejected
not_required
completed
```

Avoid booleans for operational statuses because they do not show who is responsible for the next action.

---

### 5.13 exhibitor_materials

Stores links to logos, folders, photos, PDFs and other materials.

Fields:

```text
id uuid primary key
participation_id uuid references participations(id)
material_type text
title text
url text
status text
notes text
created_at timestamptz
updated_at timestamptz
```

Material types:

```text
logo
company_profile
product_photo
brand_logo
press_release
social_media_kit
folder
video
other
```

Statuses:

```text
missing
requested
received
needs_editing
approved
published
```

---

### 5.14 smm_tasks

SMM-specific tasks and publication tracking.

Fields:

```text
id uuid primary key
participation_id uuid references participations(id)
assigned_to uuid references profiles(id)
task_type text
title text
description text
status text
due_date date
platform text
publication_url text
published_at timestamptz
notes text
created_at timestamptz
updated_at timestamptz
```

Task types:

```text
collect_materials
prepare_caption
prepare_visual
approve_post
publish_post
publish_story
publish_linkedin
publish_facebook
publish_instagram
newsletter_mention
website_profile_update
```

Statuses:

```text
not_started
in_progress
waiting_for_materials
waiting_for_approval
scheduled
published
cancelled
```

Platforms:

```text
website
instagram
facebook
linkedin
telegram
newsletter
youtube
other
```

---

### 5.15 tasks

General internal task system.

Fields:

```text
id uuid primary key
organization_id uuid references organizations(id)
event_id uuid references events(id)
participation_id uuid references participations(id)
company_id uuid references companies(id)
assigned_to uuid references profiles(id)
created_by uuid references profiles(id)
title text not null
description text
status text
priority text
due_date date
task_category text
created_at timestamptz
updated_at timestamptz
completed_at timestamptz
```

Task categories:

```text
sales
follow_up
logistics
smm
finance
documents
venue
supplier
internal
```

Priorities:

```text
low
normal
high
urgent
```

---

### 5.16 notes

Internal notes linked to different entities.

Fields:

```text
id uuid primary key
organization_id uuid references organizations(id)
event_id uuid references events(id)
company_id uuid references companies(id)
participation_id uuid references participations(id)
contact_id uuid references contacts(id)
created_by uuid references profiles(id)
note_type text
body text
created_at timestamptz
```

Note types:

```text
sales
logistics
smm
finance
general
```

---

### 5.17 activity_log

Basic audit log.

Fields:

```text
id uuid primary key
organization_id uuid references organizations(id)
event_id uuid references events(id)
actor_id uuid references profiles(id)
entity_type text
entity_id uuid
action text
metadata jsonb
created_at timestamptz
```

Examples:

```text
Company created
Participation status changed
Booth assigned
SMM task published
Material uploaded
```

---

## 6. Authentication and profiles

Use Supabase Auth.

Create a `profiles` table linked to `auth.users`.

```text
profiles
- id uuid primary key references auth.users(id)
- organization_id uuid references organizations(id)
- full_name text
- email text
- role text
- status text
- created_at timestamptz
- updated_at timestamptz
```

Roles:

```text
super_admin
event_manager
smm_manager
sales_manager
```

For MVP, use simple role-based checks in the frontend and Supabase RLS policies.

---

## 7. Frontend application

### 7.1 App type

Build a web admin frontend.

Recommended stack:

```text
React + Vite + TypeScript
Supabase JS client
TanStack Query
React Router
Tailwind CSS or another component system
```

Alternative if preferred:

```text
Next.js + Supabase
```

For the first implementation, Vite + React is acceptable and consistent with current project experience.

---

### 7.2 Main routes

```text
/login
/dashboard
/events
/events/:eventId
/companies
/companies/:companyId
/participations
/participations/:participationId
/booths
/brands
/contacts
/tasks
/smm
/settings
```

---

## 8. Dashboard requirements

### 8.1 Super Admin dashboard

Should show:

- total organizations;
- total events;
- total companies;
- total participations;
- confirmed exhibitors;
- unpaid/partially paid exhibitors;
- overdue tasks;
- SMM tasks by status;
- logistics readiness summary;
- recent activity.

---

### 8.2 Event Manager dashboard

Filtered by selected event.

Should show:

- total participants;
- booking status breakdown;
- payment status breakdown;
- booths available / soft booked / booked;
- participants missing logos/materials;
- participants with incomplete logistics;
- overdue follow-ups;
- upcoming deadlines;
- recent updates.

Must provide quick links to:

- participant list;
- booth list;
- logistics checklist;
- SMM status table;
- task board.

---

### 8.3 SMM dashboard

Should show only SMM-relevant information.

Main view: table of participants with columns:

```text
Company
Booth
Website
Description status
Logo link
Materials link
Facebook
Instagram
LinkedIn
Other socials
SMM status
Next action
Assigned person
Due date
Publication links
Notes
```

Filters:

```text
Missing logo
Missing description
Materials received
Needs editing
Waiting for approval
Scheduled
Published
No social links
```

SMM manager should be able to open a participant SMM card and update:

- SMM status;
- material status;
- publication task status;
- publication URLs;
- notes;
- due dates.

---

## 9. Main screens

### 9.1 Companies list

Table/list with:

```text
Company name
Country
City
Website
Main contact
Participations
Status
Logo preview
```

Actions:

- create company;
- edit company;
- open company card;
- add contact;
- add brand;
- create participation.

---

### 9.2 Company card

Sections:

1. General company details.
2. Contacts.
3. Brands.
4. Social links.
5. Event participations.
6. Notes.
7. Activity history.

---

### 9.3 Participation card

This is the main operational card.

Sections:

1. Company summary.
2. Event.
3. Booth assignment.
4. Participation status.
5. Contacts for this event.
6. Brands shown at this event.
7. Materials.
8. SMM workflow.
9. Logistics statuses.
10. Tasks.
11. Notes.
12. Activity history.

---

### 9.4 SMM workspace

Dedicated screen for SMM team.

Should not feel like a generic CRM screen. It should be optimized for content production.

Views:

- all participants;
- missing materials;
- ready for content;
- scheduled;
- published;
- publication links archive.

---

### 9.5 Task board

Basic task board with filters.

Views:

- by status;
- by assignee;
- by due date;
- by category;
- by event;
- by participation.

Minimum task statuses:

```text
open
in_progress
waiting
done
cancelled
```

---

## 10. Supabase RLS concept

The MVP should use RLS from the beginning.

Basic principles:

- super_admin can access everything;
- event_manager can access records within assigned organization/event;
- smm_manager can access only SMM-relevant records and limited company/participation fields;
- sales_manager can access assigned leads/companies/participations if sales module is enabled.

For the first version, field-level restrictions may be handled in the frontend, but table-level RLS should already be implemented.

Future versions should improve backend-enforced permissions.

---

## 11. Data import from AppSheet

The MVP should support manual CSV import or scripted import from exported AppSheet data.

Current AppSheet mapping:

```text
Company → companies
Contact → contacts + company_contacts
Brand → brands
BrandAssignment → company_brands and/or participation_brands
ExhibitionLogistic → participation_logistics
standsNumbers → booths + booth_assignments
```

Import should create:

1. one default organization;
2. one default event;
3. companies;
4. contacts;
5. brands;
6. participations for the default event;
7. booths based on stand numbers;
8. booth assignments;
9. basic logistics records.

---

## 12. MVP success criteria

The MVP is successful when:

1. Users can log in by role.
2. Super Admin can see all data.
3. Event Manager can manage the exhibition operationally.
4. SMM Manager has a clean workspace for participant content and publication workflow.
5. Companies, contacts, brands and participations are separated correctly.
6. Booth numbers are assigned through participations, not stored directly on company records.
7. Logistics statuses are more expressive than booleans.
8. Tasks and notes can be attached to companies/participations.
9. Current AppSheet data can be migrated/imported.
10. The architecture is ready for future exhibitor portal and SaaS expansion.

---

## 13. Recommended first development order

1. Set up Supabase schema.
2. Set up authentication and profiles.
3. Implement roles.
4. Build base admin layout.
5. Build companies CRUD.
6. Build contacts CRUD.
7. Build events and participations.
8. Build booth inventory and assignments.
9. Build brands and brand assignment.
10. Build participation logistics.
11. Build materials and SMM tasks.
12. Build dashboards.
13. Build import scripts.
14. Add activity log.
15. Polish UI and permissions.

