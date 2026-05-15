# Deploying Exhibition CRM on Vercel

## Deploy from GitHub

1. Push this repository to GitHub (if it is not already).
2. In the [Vercel dashboard](https://vercel.com), choose **Add New… → Project** and import the Git repository.
3. Vercel detects **Next.js**: leave **Framework Preset** as Next.js, **Build Command** `npm run build`, **Output Directory** (leave default), **Install Command** `npm install`.

## Required environment variables

Set these in the project **Settings → Environment Variables** (Production and Preview as needed). Values are from the Supabase project **Settings → API**.

| Name | Notes |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (e.g. `https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key. Safe for the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server-only; never `NEXT_PUBLIC_*`. Grants full DB access; keep off the client. |
| `NEXT_PUBLIC_APP_URL` | Public base URL of this app, e.g. `https://your-app.vercel.app` or `https://crm.highendshow.ae`. Used for absolute links and aligning Supabase Auth redirect configuration. |

Copy from [.env.example](.env.example). Do not commit `.env` or real keys.

## Local production build

```bash
npm install
cp .env.example .env
# Fill in real values in .env, then:
npm run build
npm run start
```

## Supabase Auth redirect URLs

In Supabase **Authentication → URL Configuration**:

- Set **Site URL** to your production origin (e.g. `https://crm.highendshow.ae` or the default `*.vercel.app` URL).
- Under **Redirect URLs**, add the same origin with a wildcard path if you use multiple auth callbacks, for example:
  - `https://crm.highendshow.ae/**`
  - `https://<your-project>.vercel.app/**`
  - Optional: `http://localhost:3000/**` for local sign-in flows.

After adding a custom domain in Vercel, update these URLs to match so email links and OAuth returns land on the CRM host.

## Custom domain `crm.highendshow.ae`

1. In Vercel **Project → Settings → Domains**, add `crm.highendshow.ae` and follow the DNS instructions (usually a `CNAME` to `cname.vercel-dns.com` or the value Vercel shows).
2. Set `NEXT_PUBLIC_APP_URL=https://crm.highendshow.ae` in Vercel environment variables.
3. Update Supabase **Site URL** and **Redirect URLs** to use `https://crm.highendshow.ae` as above.

## Notes

- Server routes use the service role only in [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts) (marked `server-only`). Browser code must use only `NEXT_PUBLIC_SUPABASE_*` via [src/lib/supabase/browser.ts](src/lib/supabase/browser.ts) when you add client-side auth.
- Table logos use native `<img>`; `next.config.ts` still lists logo hosts and `*.supabase.co` for Storage if you later use `next/image`.
