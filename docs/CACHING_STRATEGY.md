# CRM caching strategy

## Product rationale

The Exhibition CRM is read-heavy: users open list and detail screens to see the current state of companies, participations, brands, events, logistics, and materials. Most data changes only when a user edits or uploads something.

We cache read models on the server (Next.js `unstable_cache`) and refresh them with explicit `revalidateTag` after successful writes. TTL is a safety net, not the primary freshness mechanism.

## Golden rule

**Close invalidation gaps before increasing TTL.**

If invalidation is incomplete, a 15-minute cache will show stale company names, logos, or participation status until TTL expires.

## Implementation

| Piece | Location |
|-------|----------|
| Scoped cache tags | [`src/lib/cache/tags.ts`](../src/lib/cache/tags.ts) |
| Invalidation helpers | [`src/lib/cache/invalidate.ts`](../src/lib/cache/invalidate.ts) |
| TTL constants | [`src/lib/cache/ttl.ts`](../src/lib/cache/ttl.ts) |
| Loader wrapper | [`src/lib/server-cache.ts`](../src/lib/server-cache.ts) |

## TTL policy (seconds)

| TTL constant | Value | Used for |
|--------------|-------|----------|
| `ACTIONS_SHORT` | 30 | `/tasks`, action-related reads |
| `PARTICIPATIONS_MEDIUM` | 300 | `/participations` list |
| `SMM_MEDIUM` | 300 | `/smm` workspace |
| `DASHBOARD_MEDIUM` | 300 | Dashboard aggregate counters |
| `LIST_LONG` | 900 | Companies, brands, contacts, events lists |
| `DETAIL_LONG` | 900 | Entity detail pages |
| (route config) | 3600 | `export const revalidate = 3600` on pages — must be a literal, not `CACHE_TTL.*` |

Primary TTL is always set via `revalidateSeconds` on `loadCached`.

## Cache tag naming

All list/org tags include `organizationId` for multi-tenant isolation:

- `crm:org:{orgId}:companies`
- `crm:org:{orgId}:participations`
- `crm:org:{orgId}:smm`
- `crm:org:{orgId}:dashboard`
- `crm:org:{orgId}:actions`
- …

Entity detail tags are global per entity id (safe when combined with org-scoped list invalidation):

- `crm:company:{companyId}:detail`
- `crm:participation:{participationId}:detail`
- `crm:event:{eventId}:detail`

`loadCached` `keyParts` must include `orgId` (and filters/pagination) so cache entries do not collide across tenants.

## Revalidate on write

After every successful mutation, call the appropriate helper from [`invalidate.ts`](../src/lib/cache/invalidate.ts):

- `invalidateCompany` — company edit, company logo upload (includes participations list, SMM, related events)
- `invalidateBrand` — brand logo, brand links
- `invalidateContact` — contact edit/delete
- `invalidateEvent` — event CRUD, sections, program, section membership batch save
- `invalidateParticipation` — logistics, materials, participation logo, sections
- `invalidateActions` — action/task changes affecting dashboard and detail action panels

Upload API routes (`/api/files/*`) must invalidate after a successful upload and DB update.

## What we do not cache

- Supabase `getUser()` / session cookies
- `requireActiveProfile` (direct DB read each request)
- Mutation responses (server actions, API POST bodies)
- Private signed URLs
- Secrets and tokens

## Known stale UI risks

| Risk | Mitigation |
|------|------------|
| Missing tag on a new read surface | Add tag to `loadCached` and matching `invalidate*` helper |
| Long TTL + missed invalidation | Prefer fixing invalidation over shortening TTL globally |
| Cross-page fields (company name on participation list) | `invalidateCompany` ripples to participations + SMM + events |

## Manual test checklist

- [ ] Edit company name → companies list, participations list, SMM reflect change immediately
- [ ] Upload company logo → company detail and companies list update
- [ ] Upload brand logo → brand detail and brands list update
- [ ] Save participation logistics → participation list, SMM, dashboard counters update
- [ ] Batch-assign event section members → participations list section badges update after save
- [ ] Action status change → `/tasks` updates within short TTL or immediately after invalidation
- [ ] Login still works; role/org changes apply on next navigation (no cached profile)
