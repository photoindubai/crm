# Auth Redirects (CRM vs Exhibition Website)

The Exhibition CRM and the public Exhibition website **share the same Supabase project**
(`mfasaowbvqntdbgojtvi`). They therefore share one Supabase Auth configuration, including the
single **Site URL** and the list of allowed **Redirect URLs**.

This document explains how to keep CRM logins returning to the CRM (and not to the exhibition
website personal account) and what must be configured in the Supabase dashboard.

## The problem this prevents

When logging into the CRM with Google, users were sometimes redirected to the **exhibition website
personal account** instead of the CRM dashboard.

Root cause: Supabase Auth only honors an explicit `redirectTo` if that URL is present in the
**Redirect URLs allowlist**. If the CRM callback URL is missing from the allowlist (or no explicit
`redirectTo` is passed), Supabase falls back to the shared **Site URL**, which points at the
exhibition website. The browser then lands on the exhibition LK.

## How the CRM avoids the fallback

1. Every CRM auth flow passes an **explicit `redirectTo` / `emailRedirectTo`** built from the
   CRM's own URL, never the exhibition URL. See `getAuthCallbackUrl()` in
   [`src/app/login/actions.ts`](../src/app/login/actions.ts).
2. The redirect base is resolved as:

   ```
   process.env.NEXT_PUBLIC_APP_URL ?? request "origin" header ?? "http://localhost:3000"
   ```

   `NEXT_PUBLIC_APP_URL` is **preferred** so the CRM cannot accidentally resolve to the exhibition
   domain. The `origin` header is only a local-dev fallback.
3. Flows that pass a CRM `redirectTo`:
   - Google OAuth — `signInWithOAuth({ provider: "google", options: { redirectTo } })`
   - Magic link — `signInWithOtp({ options: { emailRedirectTo } })`
   - User invites (Phase 2) — `auth.admin.inviteUserByEmail(email, { redirectTo })`
4. The callback route [`src/app/auth/callback/route.ts`](../src/app/auth/callback/route.ts)
   exchanges the code, reads `next` (defaulting to `/dashboard`), and redirects using the current
   CRM request origin. It never hardcodes the exhibition URL.

Expected flow:

```
Google -> Supabase -> CRM /auth/callback?next=/dashboard -> CRM /dashboard
```

## Required environment variable

Set the CRM URL per environment. Do **not** reuse the exhibition website URL variable.

| Environment | Value |
| --- | --- |
| Local | `NEXT_PUBLIC_APP_URL=http://localhost:3000` |
| Production | `NEXT_PUBLIC_APP_URL=https://crm.highendshow.ae` |

(Replace `crm.highendshow.ae` with the real CRM domain if it differs.)

## Required Supabase dashboard configuration

In **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**, ensure **both**
CRM callback URLs are present (in addition to the exhibition website URLs that are already there):

- `http://localhost:3000/auth/callback`
- `https://crm.highendshow.ae/auth/callback`

Notes:

- The CRM and the exhibition website must each have their **own** callback URLs in the allowlist.
  The exhibition LK callback stays as-is; we only **add** the CRM ones.
- The **Site URL** remains the fallback for any flow that does not pass an explicit `redirectTo`.
  Because the CRM always passes one, the Site URL value does not affect CRM logins.

## Google Cloud OAuth

Do **not** change the Google Cloud OAuth redirect URI for this fix. It should point at Supabase, not
at either app:

```
https://mfasaowbvqntdbgojtvi.supabase.co/auth/v1/callback
```

Only touch this if it is actually wrong.

## Security

- CRM access still requires a valid `public.profiles` row with `status = 'active'` and the
  appropriate role/status checks (see [`USER_MANAGEMENT.md`](./USER_MANAGEMENT.md)). A valid
  Supabase session alone is not enough.
- Exhibition website users without a CRM profile cannot enter the CRM: the callback and
  `requireActiveProfile` sign them out and redirect to `/login?error=profile`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser; auth-admin operations run server-side only.

## Verification

1. Local CRM Google login returns to `http://localhost:3000/dashboard`.
2. Production CRM Google login returns to `https://crm.highendshow.ae/dashboard`.
3. Exhibition website login still returns to the exhibition LK.
4. A user without a CRM profile is rejected (`/login?error=profile`).
