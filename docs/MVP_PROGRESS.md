# MVP Progress

This document tracks implementation status against `exhibition-saas-spec/01_MVP_SPEC.md`.

## Decisions

- Application stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase.
- Database safety rule: create a fresh dump in `/home/anton/projects/backups` before every database migration, data import, destructive SQL, or schema-changing Supabase MCP action.
- Existing public form tables stay untouched unless a later migration explicitly requires integration.
- Current operational model uses unified `actions` as the canonical workflow entity. Legacy `tasks` and `smm_tasks` are transitional sources only.
- Booth numbers belong to `participations` and `booth_assignments` only. Company pages do not expose booth data anymore.
- List pages should stay flat and cheap: Supabase views + pagination + server-side cache. Heavy relational reads are allowed only on detail pages.

## Completed

- Added project rule file with database backup requirement.
- Added Supabase backup script.
- Verified successful Supabase dump: `/home/anton/projects/backups/mfasaowbvqntdbgojtvi_20260514T185938Z.dump`.
- Started Next.js application scaffold.
- Added base app shell and initial placeholder routes.
- Added Supabase browser/server client helpers.
- Applied initial CRM core schema migration in Supabase.
- Added default organization and default 2026 event.
- Extended `profiles` for CRM compatibility without removing legacy roles.
- Added generated Supabase TypeScript database types.
- Added import source ID columns and bulk import indexes for idempotent local-data imports.
- Imported HESHS2026 local data into CRM tables: 28 companies, 28 participations, 46 booths, 47 booth assignments, 174 brands, 174 brand assignments, 37 contacts, 28 logistics rows, and 79 logo material links.
- Added list-performance migration with missing foreign-key/filter indexes and flat Supabase views: `company_list_view`, `participation_list_view`, `smm_workspace_view`, and `task_list_view`.
- Refactored `/companies`, `/participations`, `/smm`, and `/tasks` to use flat view queries with pagination and simple filters instead of nested relational selects.
- Added `/companies/[id]` detail page for heavier company, contact, participation, brand, logistics, note, and action data.
- Updated `/companies/[id]` with the Stitch `Company Detail View` layout adapted to the current domain model: company hero, contacts, brand portfolio, action plan, participations, and notes.
- Removed `force-dynamic` from dashboard and list pages; dashboard uses lightweight head count queries.
- Added Supabase Auth login/logout flow, magic-link email sign-in, Google OAuth sign-in, callback handling, middleware session gate, and active-profile checks backed by existing `public.profiles` roles/statuses.
- Applied CRM normalization migration after backup `/home/anton/projects/backups/mfasaowbvqntdbgojtvi_20260516T085723Z.dump`.
- Added company address/phone/email fields, event sections/program items, participation display names, participant-contact links with trigger validation, unified `actions`, action subjects/recipients, and event action templates.
- Added flat action views: `action_list_view`, `company_action_list_view`, `participation_action_list_view`, `event_action_list_view`, and `contact_action_list_view`.
- Refactored the `/tasks` route into a unified Actions list backed by `action_list_view`.
- Updated company detail to load Action Plan from `company_action_list_view` instead of legacy `tasks`, `smm_tasks`, and materials joins.
- Added simple `/participations/[id]` and `/contacts/[id]` detail pages using bounded queries and action views.
- Added top-level `/contacts`, `/events`, and `/brands` modules to navigation.
- Added `/events/[id]` event detail view with administrative actions, participating exhibitors, sections, program items, and a simple exhibition map panel.
- Added `/brands/[id]` brand detail view with linked companies, participations, booths, and event context.
- Added Next.js server-side query caching for CRM reads with cache tags and manual invalidation helper for future save/update flows.
- Formalized CRM read caching: org/event/entity scoped tags, `invalidate*` helpers, tiered TTL (30s actions / 5m operational / 15m reference data), upload invalidation, and [`docs/CACHING_STRATEGY.md`](./CACHING_STRATEGY.md).
- Added `/contacts`, `/events`, and `/brands` list pages with pagination and simple search/filter behavior.
- Switched the visual theme closer to the selected Stitch design direction.
- Replaced placeholder/fake brand content on detail pages with real brand relations from Supabase.
- Removed booth presentation from company list and company detail UI to keep booth ownership strictly at the participation level.
- Added first working edit/create flows on `Company Detail`:
  - edit base company fields;
  - add/link company contacts;
  - assign company brands;
  - invalidate server cache after writes.
- Added participation detail edit flows:
  - add/edit/delete participation contacts;
  - add/edit/delete participation brands;
  - add/edit/delete participation materials;
  - save participation logistics statuses.
- Added contacts module edit/delete server actions with relationship cleanup and cache invalidation.
- Added server-side R2 upload API routes plus UI upload controls on detail screens:
  - company logos (`/api/files/company-logo`);
  - brand logos (`/api/files/brand-logo`);
  - participation logos (`/api/files/participation-logo`);
  - participation materials (`/api/files/participation-material`).
- Updated event detail participant counters to use real totals from `participations` while keeping the 8-row preview table.
- Added event CRUD baseline:
  - create event from `/events`;
  - edit/delete event from `/events/[id]` with safe delete guard when participations exist.
- Added event content CRUD on `/events/[id]`:
  - create/edit/delete `event_sections`;
  - create/edit/delete `event_program_items`.
- Added section participation model:
  - new `participation_sections` relation table migration;
  - section assignment/unassignment on participation detail;
  - participant filtering by section on event detail.
- Added DB coverage inventory doc: `docs/DB_TABLES_STATUS.md`.
- Hardened CRM OAuth/magic-link redirects to always return to the CRM (`NEXT_PUBLIC_APP_URL` preferred over the request origin), preventing fallback to the shared exhibition-website Auth Site URL. See `docs/AUTH_REDIRECTS.md`.
- Added user management UI at `/settings/users` (super_admin only): invite CRM users via Supabase Auth Admin (`inviteUserByEmail`), edit role/status, resend invite, and disable users (application-level). Guards protect the last active super_admin and self-disable. See `docs/USER_MANAGEMENT.md`.
- Standardized profile status lifecycle (`active`/`invited`/`disabled`) with a DB CHECK constraint; invited users are upgraded to active at auth entry points while protected pages stay strict (`active` only).
- Added an `activity_log` write path (`src/lib/activity-log.ts`) plus an in-org insert policy; user-management actions are now audited.
- Added record ownership/attribution: auto-stamped `created_by` plus a manually assignable owner (`owner_id` on companies/contacts/brands, reused `sales_owner_id` on participations, `assigned_to` on actions). List pages gained an inline Owner picker and an "All | Mine" filter (companies, contacts, brands, participations, tasks). Owner changes are audited. See `docs/OWNERSHIP.md`.
- Extended `public.profiles` with `first_name`, `last_name`, `position`, `phone`; backfilled from `auth.users` metadata; self-service profile edit at `/settings/profile` (role remains super_admin-only).

## In Progress

- CRUD/editing flows for the new unified action model.
- Broader CRUD coverage for contacts, brands, participations, events, notes, and logistics.
- Aligning all docs and remaining screens with the normalized domain model:
  - `Company` = base entity;
  - `Participation` = company-in-event;
  - `booths` only via participation;
  - `actions` as the single operational workflow model.
- Role-specific module access rules, if a concrete access matrix is needed.

## Future / Post-MVP (documented, not scheduled for immediate MVP)

- **CSV Import Wizard with Logo URL Ingestion to R2** — SaaS onboarding for new organizers: upload CSV/XLSX, map columns, dry-run preview, apply import (companies + participations + booths/contacts/brands), optional logo URL → R2 pipeline. Not part of current MVP scope. Full plan: `docs/02_ROADMAP_NEXT_PHASES.md` §18; file/R2 notes: `docs/FILES_AND_R2.md` (Future TODO → Bulk imports).

## Not Started

- Full edit/remove flows for brands from brand module/detail screens.
- Create/edit flows for participations, booth assignments, notes, and action templates.
- Unified create/edit flows for `actions` from company, participation, event, contact, and global action list screens.
- Basic audit/activity log UI (a write path now exists for user-management actions via `src/lib/activity-log.ts`; broader write coverage and a viewer are still pending).
- Role-aware field visibility and module restrictions beyond the current authenticated route protection.
- Broader AppSheet/form-data import tooling beyond the current HESHS2026 local-data import (see **Future / Post-MVP** — CSV Import Wizard; interactive wizard not started).
- Dashboard drilldowns and richer operational reporting.
