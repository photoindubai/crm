# MVP Progress

This document tracks implementation status against `exhibition-saas-spec/01_MVP_SPEC.md`.

## Decisions

- Application stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase.
- Database safety rule: create a fresh dump in `/home/anton/projects/backups` before every database migration, data import, destructive SQL, or schema-changing Supabase MCP action.
- Existing public form tables stay untouched unless a later migration explicitly requires integration.

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
- Added `/companies/[id]` detail page for heavier company, contact, participation, booth, brand, material, SMM task, note, and task data.
- Removed `force-dynamic` from dashboard and list pages; dashboard uses lightweight head count queries.
- Added Supabase Auth login/logout flow, magic-link email sign-in, Google OAuth sign-in, callback handling, middleware session gate, and active-profile checks backed by existing `public.profiles` roles/statuses.

## In Progress

- Role-specific module access rules, if a concrete access matrix is needed.

## Not Started

- CRUD/editing flows for companies, contacts, brands, events, participations, booths, logistics, materials, SMM tasks, general tasks, notes, activity log.
- Broader AppSheet/form-data import tooling beyond the current HESHS2026 local-data import.
- Dashboard drilldowns and richer operational reporting.
