# Record Ownership & "My Records"

This document describes how the CRM attributes records to users and how the "Mine" filters work.

## Model: created_by + owner

Two complementary concepts:

- **`created_by`** — *who created the record*. Auto-stamped on insert, never edited from the UI.
  It is informational/audit-oriented.
- **owner** — *who is responsible for the record now*. Manually assignable from the list pages and
  used by the "Mine" filters.

The owner column differs per entity because some tables already had a suitable column:

| Entity | Table | Owner column | `created_by` |
|---|---|---|---|
| Company | `companies` | `owner_id` | yes |
| Contact | `contacts` | `owner_id` | yes |
| Brand | `brands` | `owner_id` | yes |
| Participation | `participations` | `sales_owner_id` (existing) | yes |
| Action | `actions` | `assigned_to` (existing) | yes (existing) |

All owner columns reference `public.profiles(id)` with `on delete set null`, and are indexed
together with `created_by` for cheap "Mine" filtering.

## UI

Each list page (`/companies`, `/contacts`, `/brands`, `/participations`, `/tasks`) has:

- an **Owner** control (`OwnerCell`) per row to assign / reassign / unassign the owner inline;
- an **All | Mine** toggle (`MineToggle`) that filters to records owned by the current user.

On `/tasks`, "Mine" is equivalent to `assigned_to = me`; the assignee dropdown is disabled while
"Mine" is active.

The "Mine" state is propagated through pagination links and is part of the server-cache key, so
filtered pages cache independently from the unfiltered ones.

## Server pieces

- `src/lib/ownership.ts` — client-safe types/labels (`OwnerEntity`, `OrgUser`, `userDisplayName`).
  Safe to import from both server pages and the client `OwnerCell`.
- `src/lib/ownership.server.ts` — `ENTITY_OWNERSHIP` allowlist (entity → table/column/cache
  invalidation) and `getOrgUsers(orgId)`.
- `src/lib/ownership-actions.ts` — the `setRecordOwner` server action.
- `src/components/owner-cell.tsx` — client dropdown that submits `setRecordOwner` and refreshes.
- `src/components/mine-toggle.tsx` — "All | Mine" links.

### `setRecordOwner` guards

The server action is the only write path and is deliberately strict:

1. Requires an **active** profile (`requireActiveProfile`).
2. Only **allowlisted entities** can be targeted; the table/column is resolved server-side from the
   allowlist, never from client input.
3. The **record must belong to the caller's organization**.
4. A non-null **owner must be a profile in the same organization**.
5. `owner_id` of `"me"` resolves to the caller; an empty value unassigns (sets `null`).
6. Every successful change is written to `activity_log` (`action = "owner_changed"`).

## Auto-stamping on create

`created_by` is stamped wherever the app creates records and the actor is known:

- `createEvent` stamps `events.created_by`.
- Adding a company contact stamps `contacts.created_by` and `contacts.owner_id` (the creator is the
  initial owner).

Other create paths can stamp `created_by` the same way as they are built out.

## Backfill of existing data (decision: ask later)

Existing imported rows (the HESHS2026 import and anything created before this feature) are left
**unattributed** (`owner_id` / `created_by` = `null`) on purpose. They simply won't appear under
"Mine" until someone takes ownership via the inline Owner picker.

A future, optional bulk "claim" action (assign a batch of unowned records to a user) can be added if
needed; it is intentionally out of scope for now.

## Migration

`supabase/migrations/20260529073000_record_ownership.sql`:

- adds `owner_id` (companies/contacts/brands) and `created_by` (companies/contacts/brands/
  participations/events);
- adds supporting indexes;
- recreates `participation_list_view` to expose `sales_owner_id` and `created_by`.

A fresh backup is taken before applying, per the project database-safety rule.
