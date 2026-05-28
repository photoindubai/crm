# User Management

Internal user administration for the Exhibition CRM. A `super_admin` can invite CRM users and
manage their role and status from **Settings → Users** (`/settings/users`).

## Auth vs. profiles model

The CRM authenticates with **Supabase Auth** (`auth.users`) but authorizes against the operational
table **`public.profiles`**:

| Concern | Source |
| --- | --- |
| Identity / credentials / sessions | `auth.users` (Supabase Auth) |
| CRM access, role, status, org, name | `public.profiles` |

A profile is **1:1** with an auth user (`profiles.id = auth.users.id`). A valid Supabase session is
**not** sufficient to enter the CRM — the user must also have a `profiles` row with `status = 'active'`
(see `requireActiveProfile` in [`src/lib/auth.ts`](../src/lib/auth.ts)).

Tenancy today is single-organization per profile via `profiles.organization_id`. There is no
`organization_memberships` table yet (see Limitations).

## Roles

Assignable in the UI (`CRM_ROLES` in [`src/lib/roles.ts`](../src/lib/roles.ts)):

- `super_admin` — full access, including user management
- `event_manager`
- `smm_manager`
- `sales_manager`

Legacy roles (`sales`, `marketing`, `ops`) remain valid in the DB constraint but are not offered in
the UI. Today only `super_admin` is enforced in the application (for `/settings`); other roles do not
yet gate modules.

## Status lifecycle

`profiles.status` is constrained (migration `20260528191900`) to:

| Status | Meaning | Can access CRM? |
| --- | --- | --- |
| `active` | Normal member | Yes |
| `invited` | Provisioned, not yet accepted | Only via an auth entry point, which upgrades to `active` |
| `disabled` | Application-level deactivation | No |

Status handling is intentionally split:

- **Protected pages/actions** use `requireActiveProfile` — strict: `active` only. `invited`,
  `disabled`, and `null` are all blocked.
- **Auth entry points** (`/auth/callback` and the password `login` action) use `resolveEntryProfile`,
  which is the single place where `invited` is accepted and **immediately upgraded to `active`**.
  `disabled`/`null`/unknown are rejected (sign-out + `?error=profile`).

So an invited user becomes `active` on their first successful sign-in, after which the strict gate
lets them through everywhere.

## Invite flow

1. A `super_admin` opens `/settings/users` and submits the invite form (full name, email, role).
2. The server action `inviteUser` ([`src/app/settings/users/actions.ts`](../src/app/settings/users/actions.ts)):
   - verifies the caller is `super_admin` (`requireSuperAdmin`);
   - validates email + role;
   - scopes the new user to the **caller's own organization**;
   - rejects if a CRM profile already exists for that email (no duplicates);
   - calls `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: <APP_URL>/auth/callback?next=/dashboard, data })`;
   - upserts `public.profiles` (`id` = returned auth id, `status = 'invited'`).
3. The invitee receives an email, accepts, lands on the CRM `/auth/callback`, and is upgraded to
   `active`.

### Existing Auth user handling

If the email already belongs to an Auth user (e.g. an exhibition-website account) but has no CRM
profile, `inviteUserByEmail` fails with an "already registered" error. In that case `inviteUser`:

- resolves the auth user by **exact email match** only (`listUsers`);
- creates the CRM profile **only inside the caller's organization**;
- logs the action (`user_granted_existing_account`);
- returns a clear message that an existing account was granted CRM access.

It never silently grants access to unrelated users, and never surfaces raw auth errors.

## Edit / disable

- `updateUser` — change full name, role, and status within the caller's org.
- `disableUser` — set `status = 'disabled'` (application-level only; no `auth.users` deletion).
- `resendInvite` — best-effort re-invite for `invited` users.

Guardrails:

- The **last active super_admin** cannot be demoted to a lower role or disabled.
- A super_admin cannot disable **their own** account without explicit confirmation.

All user-management mutations write an audit row via `logActivity`
([`src/lib/activity-log.ts`](../src/lib/activity-log.ts)) and revalidate `/settings/users`.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` and the admin client live only in `server-only` modules
  ([`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts)). They are never sent to the browser.
- The Auth Admin API is called **server-side only**. Client components never touch it.
- No direct inserts into `auth.users`; invites go through `auth.admin.inviteUserByEmail`.
- `/settings` and `/settings/users` are protected **server-side** via `requireSuperAdmin`. Hiding the
  nav link is cosmetic only.
- The `/settings/users` page is `force-dynamic` (never cached) so role/status changes are immediate.
  `requireActiveProfile` reads the profile fresh on every request.

## Limitations / future SaaS model

- Single organization per profile (`profiles.organization_id`). No `organization_memberships`
  junction, so a user cannot belong to multiple organizations yet.
- No org picker in the invite UI — users are added to the caller's organization.
- No password-management UI; invites use Supabase's email flow.
- Only `super_admin` is enforced in-app; finer role-based module access is future work.
- Future SaaS direction: introduce `organization_memberships (user_id, organization_id, role, status)`
  to support multi-org users and per-org roles, replacing the single `profiles.organization_id` link.
