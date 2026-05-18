# DB Tables Status

Snapshot date: May 18, 2026.

Legend:
- `Connected` — table is used in current UI flows.
- `Partial` — read-only or limited CRUD coverage.
- `Not connected` — no direct UI module yet.
- `Legacy` — transitional table; replaced by normalized model.

## Core CRM tables

| Table | Purpose | UI status | Main screens / notes |
|---|---|---|---|
| `organizations` | tenant root | `Partial` | Used in auth/ownership checks, no management UI |
| `profiles` | CRM users/roles | `Partial` | Used by auth gates, no user-admin UI |
| `events` | exhibitions | `Connected` | `/events`, `/events/[id]` list/detail/create/edit/delete |
| `event_sections` | event content sections | `Connected` | `/events/[id]` create/edit/delete |
| `event_program_items` | conference/program items | `Connected` | `/events/[id]` create/edit/delete |
| `companies` | company master records | `Connected` | `/companies`, `/companies/[id]` |
| `contacts` | contact master records | `Connected` | `/contacts`, `/contacts/[id]` |
| `company_contacts` | company-contact links | `Connected` | company detail + contact relations |
| `brands` | brand master records | `Partial` | list/detail + logo upload; no full brand CRUD yet |
| `company_brands` | company-brand links | `Connected` | company detail assign/link |
| `participations` | company-in-event records | `Partial` | list/detail read + related edits; no full participation CRUD yet |
| `participation_contacts` | participation-contact links | `Connected` | participation detail add/edit/delete |
| `participation_brands` | participation-brand links | `Connected` | participation detail add/edit/delete |
| `participation_sections` | participation-to-section links | `Connected` | participation detail assign/unassign + event detail participant filtering by section |
| `participation_logistics` | logistics statuses | `Connected` | participation detail save flow |
| `booths` | booth definitions per event | `Partial` | read via participation/event relations, no booth CRUD UI |
| `booth_assignments` | participation-to-booth mapping | `Partial` | read in details, no assignment CRUD UI |
| `exhibitor_materials` | participation materials | `Connected` | participation detail add/edit/delete + upload bridge |
| `notes` | scoped internal notes | `Partial` | read on company detail; no complete notes CRUD module |
| `files` | canonical file metadata | `Connected` | upload APIs + logo/material resolvers |
| `actions` | unified operational tasks | `Partial` | global/actions views are read-oriented; full action CRUD pending |
| `action_subjects` | action scope links | `Partial` | used by views/backend model; no direct editor |
| `action_recipients` | action recipients | `Partial` | used by model/views; no direct editor |
| `action_templates` | event action templates | `Partial` | read on participation detail; no template CRUD UI |
| `activity_log` | audit/event stream | `Not connected` | no UI yet |

## Legacy / transitional operational tables

| Table | Purpose | UI status | Notes |
|---|---|---|---|
| `tasks` | pre-normalization tasks | `Legacy` | replaced by `actions` model |
| `smm_tasks` | legacy SMM tasks | `Legacy` | replaced by `actions` model |

## Public-form / ingestion tables (outside core CRM UI)

| Table | Purpose | UI status |
|---|---|---|
| `booth_applications` | booth form submissions | `Not connected` |
| `visitor_registrations` | visitor registration submissions | `Not connected` |
| `card_contact_submissions` | card/contact form submissions | `Not connected` |
| `newsletter_subscribers` | newsletter opt-ins | `Not connected` |

## Related read views already used by UI

- `company_list_view`
- `participation_list_view`
- `smm_workspace_view`
- `task_list_view` (legacy naming; powers `/tasks` actions list)
- `action_list_view`
- `company_action_list_view`
- `participation_action_list_view`
- `event_action_list_view`
- `contact_action_list_view`
