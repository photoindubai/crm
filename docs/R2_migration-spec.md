We are moving all uploads and asset management in this Exhibition CRM MVP to Cloudflare R2.

Context:
This is a Next.js 15 + Supabase Exhibition CRM prototype. It is currently an MVP for one tenant, but the database already has an organizations table and many core tables already include organization_id.

Important current SaaS/domain model:
- Organization / Organizer owns companies and events.
- Company belongs to organization.
- Event belongs to organization.
- Participation connects one company to one event.
- A company can participate in many events.
- Do not model companies as children of events.
- Do not store all company files under event paths.

Existing current organization:
- DEFAULT_ORGANIZATION_ID is available in .env.local
- DEFAULT_ORGANIZATION_SLUG is available in .env.local
- Current slug is hesh

Cloudflare R2 is already prepared.

Environment variables already available in .env.local:

R2_ACCOUNT_ID
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PUBLIC_BUCKET=exhibition-public-assets
R2_PRIVATE_BUCKET=exhibition-private-files
R2_PUBLIC_BASE_URL=https://assets.chat-admin.online
DEFAULT_ORGANIZATION_ID
DEFAULT_ORGANIZATION_SLUG

Important:
- R2_PUBLIC_BASE_URL must come from env.
- Do not hardcode assets.chat-admin.online anywhere in application logic.
- Later this domain will change.
- Store storage_path in DB, not absolute URLs as the primary source of truth.
- public_url may be stored for convenience, but the canonical source should be provider + bucket + storage_path.
- Do not expose R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY to client components.
- Use server-side upload through Next.js route handlers or server actions.
- Do not implement direct browser-to-R2 upload yet.
- Do not configure R2 CORS unless strictly required.
- Keep old Strapi/external URLs working.

Current legacy file fields:
- companies.company_logo_url
- brands.brand_logo_url
- exhibitor_materials.url

Goal:
Add a SaaS-ready file and asset management layer using:
- Cloudflare R2 for physical file storage
- Supabase Postgres for metadata
- Next.js server-side upload handlers
- backward-compatible migration from existing external/Strapi URLs

Do not over-engineer.
Do not build a full DAM system.
Do not build direct-to-R2 presigned uploads yet.
Do not remove existing legacy URL fields yet.
Do not break current pages.

==================================================
1. Inspect current schema and code
==================================================

Inspect the current Supabase schema through MCP before changing anything.

Pay special attention to:

- organizations
- companies
- events
- participations
- brands
- contacts
- participation_brands
- company_brands
- exhibitor_materials
- smm_tasks
- tasks
- profiles

Also inspect current Next.js pages/components:

- Company list
- Company detail
- Participant/Participation detail
- SMM workspace
- Brand pages/components if present
- Any existing image/logo rendering helpers
- Any current Supabase views used by list pages

Confirm:
- organizations table already exists.
- Do not recreate organizations.
- Use the existing DEFAULT_ORGANIZATION_ID and DEFAULT_ORGANIZATION_SLUG from env for the current single-tenant MVP where needed.

==================================================
2. Add files metadata table
==================================================

Create a new Supabase migration for a universal files table.

Table name:

public.files

Fields:

- id uuid primary key default gen_random_uuid()
- organization_id uuid not null references public.organizations(id)
- event_id uuid nullable references public.events(id)
- company_id uuid nullable references public.companies(id)
- participation_id uuid nullable references public.participations(id)
- brand_id uuid nullable references public.brands(id)

- entity_type text not null
- entity_id uuid not null

- file_category text not null
- file_role text nullable

- provider text not null default 'cloudflare_r2'
- bucket text not null
- storage_path text nullable
- external_url text nullable
- public_url text nullable

- original_filename text nullable
- mime_type text nullable
- size_bytes bigint nullable

- is_public boolean not null default false
- source text nullable
- status text not null default 'uploaded'

- uploaded_by uuid nullable references public.profiles(id)
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Recommended checks:
- provider in ('cloudflare_r2', 'supabase_storage', 'aws_s3', 'external')
- status in ('uploaded', 'pending_review', 'approved', 'rejected', 'archived')
- entity_type in ('organization', 'company', 'event', 'participation', 'brand', 'smm_task', 'task', 'material')
- bucket in ('exhibition-public-assets', 'exhibition-private-files') when provider = 'cloudflare_r2'

Add indexes:

- files(organization_id)
- files(event_id)
- files(company_id)
- files(participation_id)
- files(brand_id)
- files(entity_type, entity_id)
- files(file_category)
- files(status)
- files(provider)
- files(bucket)
- files(created_at)

Rules:
- Company-level files must not require event_id.
- Event-level files must not require company_id.
- Participation-level files should include organization_id, event_id, company_id, participation_id.
- Brand-level files should include organization_id and brand_id.
- external legacy files may have external_url/public_url and no storage_path.

==================================================
3. Add optional primary file references
==================================================

Add nullable columns if they do not already exist:

companies:
- primary_logo_file_id uuid nullable references public.files(id)

brands:
- primary_logo_file_id uuid nullable references public.files(id)

participations:
- public_logo_file_id uuid nullable references public.files(id)

Do not remove:
- companies.company_logo_url
- brands.brand_logo_url
- exhibitor_materials.url

These legacy fields must continue to work.

==================================================
4. R2 path conventions
==================================================

Use DEFAULT_ORGANIZATION_SLUG for human-readable R2 paths.

Canonical path prefix:

organizations/{organization_slug}/...

For current MVP:
organization_slug comes from process.env.DEFAULT_ORGANIZATION_SLUG

Do not use hardcoded "hesh" in code. Use env.

Public bucket:
R2_PUBLIC_BUCKET=exhibition-public-assets

Private bucket:
R2_PRIVATE_BUCKET=exhibition-private-files

Public base URL:
R2_PUBLIC_BASE_URL from env

Public file paths:

Company-level public files:

organizations/{organization_slug}/companies/{company_id}/logos/{file_id}-{safe_filename}
organizations/{organization_slug}/companies/{company_id}/materials/{file_id}-{safe_filename}

Brand-level public files:

organizations/{organization_slug}/brands/{brand_id}/logos/{file_id}-{safe_filename}

Event-level public files:

organizations/{organization_slug}/events/{event_id}/floorplans/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/public-documents/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/banners/{file_id}-{safe_filename}

Participation-level public files:

organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/logos/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/materials/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/smm/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/brochures/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/product-photos/{file_id}-{safe_filename}

Private file paths:

Company-level private files:

organizations/{organization_slug}/companies/{company_id}/private/{file_id}-{safe_filename}

Event-level private files:

organizations/{organization_slug}/events/{event_id}/private-documents/{file_id}-{safe_filename}

Participation-level private files:

organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/contracts/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/invoices/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/payment-proofs/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/technical-documents/{file_id}-{safe_filename}
organizations/{organization_slug}/events/{event_id}/participations/{participation_id}/stand-design/{file_id}-{safe_filename}

Filename rules:
- sanitize filenames
- lowercase if reasonable
- replace spaces with hyphens
- remove unsafe characters
- prefix with file_id to avoid collisions

Example:
organizations/hesh/companies/{company_id}/logos/{file_id}-audio-deluxe-logo.png

==================================================
5. R2 server-side client
==================================================

Add an R2 server-only helper.

Suggested file:

src/lib/r2/server.ts

Use AWS SDK S3-compatible client if available. If not installed, add:

@aws-sdk/client-s3

Create helper functions:

- getR2Client()
- uploadToR2(params)
- deleteFromR2(params) optional
- buildR2PublicUrl(storagePath)
- getR2ObjectUrl(fileRecord)
- sanitizeFilename(filename)
- buildStoragePath(params)

Important:
- This file must be server-only.
- It must not be imported by client components.
- R2 secrets must only be used server-side.
- Use R2_ENDPOINT from env.
- Use R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY from env.
- Use region = 'auto' if required by AWS SDK/R2.

==================================================
6. Upload route handlers / server actions
==================================================

Implement simple server-side upload endpoints.

Suggested route handlers:

POST /api/files/company-logo
POST /api/files/brand-logo
POST /api/files/participation-logo
POST /api/files/participation-material

Each route should:

1. Require authenticated/internal user if auth helpers exist.
2. Accept multipart/form-data.
3. Validate entity IDs.
4. Validate file type and size.
5. Upload to R2.
6. Create files metadata row in Supabase.
7. Update primary file reference where applicable.
8. Return file metadata and public URL.

For MVP, if auth is not fully wired yet, keep the handler server-side and document the auth TODO, but do not expose secrets.

Allowed logo MIME types:
- image/png
- image/jpeg
- image/webp
- image/svg+xml

Logo max size:
- 5 MB

Participation material MIME types:
- application/pdf
- image/png
- image/jpeg
- image/webp
- application/zip if easy, otherwise skip ZIP for now

Material max size:
- 25 MB

Company logo upload:
- entity_type = 'company'
- entity_id = company.id
- organization_id = company.organization_id or DEFAULT_ORGANIZATION_ID
- company_id = company.id
- file_category = 'logo'
- file_role = 'primary'
- bucket = R2_PUBLIC_BUCKET
- is_public = true
- provider = 'cloudflare_r2'
- status = 'approved'
- set companies.primary_logo_file_id = files.id

Brand logo upload:
- entity_type = 'brand'
- entity_id = brand.id
- organization_id = brand.organization_id or DEFAULT_ORGANIZATION_ID
- brand_id = brand.id
- file_category = 'logo'
- file_role = 'primary'
- bucket = R2_PUBLIC_BUCKET
- is_public = true
- provider = 'cloudflare_r2'
- status = 'approved'
- set brands.primary_logo_file_id = files.id

Participation logo upload:
- entity_type = 'participation'
- entity_id = participation.id
- organization_id = participation.organization_id or DEFAULT_ORGANIZATION_ID
- event_id = participation.event_id
- company_id = participation.company_id
- participation_id = participation.id
- file_category = 'logo'
- file_role = 'public'
- bucket = R2_PUBLIC_BUCKET
- is_public = true
- provider = 'cloudflare_r2'
- status = 'approved'
- set participations.public_logo_file_id = files.id

Participation material upload:
- entity_type = 'participation'
- entity_id = participation.id
- organization_id = participation.organization_id or DEFAULT_ORGANIZATION_ID
- event_id = participation.event_id
- company_id = participation.company_id
- participation_id = participation.id
- file_category from form:
  - brochure
  - company_profile
  - product_photo
  - social_media_material
  - press_release
  - other
- bucket = R2_PUBLIC_BUCKET for now
- is_public = true for now
- provider = 'cloudflare_r2'
- status = 'uploaded' or 'pending_review'

Also create or update exhibitor_materials row only if the current UI depends on exhibitor_materials.
If doing so:
- exhibitor_materials.url should receive the public URL for backward compatibility
- but canonical file metadata must be public.files

==================================================
7. Legacy URL migration
==================================================

Create a safe script or migration to register existing legacy URLs into public.files without downloading files.

Do not copy external files into R2 in this step unless explicitly implemented as a separate optional script.

Migration behavior:

A) companies.company_logo_url

For every company with company_logo_url not null and no equivalent files row:

Insert into files:
- organization_id = companies.organization_id or DEFAULT_ORGANIZATION_ID
- company_id = companies.id
- entity_type = 'company'
- entity_id = companies.id
- file_category = 'logo'
- file_role = 'legacy_external'
- provider = 'external'
- bucket = 'external'
- external_url = companies.company_logo_url
- public_url = companies.company_logo_url
- is_public = true
- source = 'legacy_company_logo_url'
- status = 'approved'

Then set companies.primary_logo_file_id to this files.id only if primary_logo_file_id is null.

B) brands.brand_logo_url

For every brand with brand_logo_url not null and no equivalent files row:

Insert into files:
- organization_id = brands.organization_id or DEFAULT_ORGANIZATION_ID
- brand_id = brands.id
- entity_type = 'brand'
- entity_id = brands.id
- file_category = 'logo'
- file_role = 'legacy_external'
- provider = 'external'
- bucket = 'external'
- external_url = brands.brand_logo_url
- public_url = brands.brand_logo_url
- is_public = true
- source = 'legacy_brand_logo_url'
- status = 'approved'

Then set brands.primary_logo_file_id to this files.id only if primary_logo_file_id is null.

C) exhibitor_materials.url

For every exhibitor_materials row with url not null and no equivalent files row:

Join participation to get:
- organization_id
- event_id
- company_id
- participation_id

Insert into files:
- organization_id = participation.organization_id or DEFAULT_ORGANIZATION_ID
- event_id = participation.event_id
- company_id = participation.company_id
- participation_id = participation.id
- entity_type = 'participation'
- entity_id = participation.id
- file_category = exhibitor_materials.material_type or 'material'
- file_role = 'legacy_external'
- provider = 'external'
- bucket = 'external'
- external_url = exhibitor_materials.url
- public_url = exhibitor_materials.url
- is_public = true
- source = 'legacy_exhibitor_materials_url'
- status = exhibitor_materials.status or 'uploaded'

Make the migration idempotent.
Running it twice must not create duplicates.

If doing this as a Node script instead of SQL:
- add npm script: migrate:legacy-files
- document how to run it
- do not require downloading external files

==================================================
8. Optional: Copy existing external logos to R2
==================================================

This is optional and should be implemented only if straightforward.

Create a separate script:

scripts/copy-legacy-logos-to-r2.mjs

Purpose:
- Download company_logo_url and brand_logo_url
- Upload them to R2
- Create new files rows with provider='cloudflare_r2'
- Update primary_logo_file_id to the new R2 file
- Keep legacy files rows for history

Rules:
- Do not run automatically.
- Add dry-run mode.
- Skip failed downloads and log errors.
- Do not delete old URLs.
- Limit concurrency to avoid hammering Strapi/external hosts.
- If implementation is risky, document it as TODO instead of building it now.

The main MVP does not require this script. Registering legacy metadata is enough.

==================================================
9. Logo resolution fallback
==================================================

Create a helper:

src/lib/files/resolveLogo.ts

Required functions:

- resolveCompanyLogo(company)
- resolveBrandLogo(brand)
- resolveParticipationLogo(participation, company)

Fallback order for participation/company display:

1. participation.public_logo_file_id file, if joined/available
2. company.primary_logo_file_id file, if joined/available
3. companies.company_logo_url legacy URL
4. placeholder

For company display:

1. companies.primary_logo_file_id file
2. companies.company_logo_url legacy URL
3. placeholder

For brand display:

1. brands.primary_logo_file_id file
2. brands.brand_logo_url legacy URL
3. placeholder

URL generation:
- For provider='cloudflare_r2':
  use R2_PUBLIC_BASE_URL + '/' + storage_path for public files.
- For provider='external':
  use public_url or external_url.
- Never hardcode the public base URL.

==================================================
10. Update list views and Supabase views if needed
==================================================

Inspect existing flat views:
- company_list_view
- participation_list_view
- smm_workspace_view
- task_list_view

If these views exist and currently use company_logo_url or brand_logo_url directly, update them carefully to include:

- company_logo_url legacy field
- company_primary_logo_file_id
- participation_public_logo_file_id if relevant
- optionally resolved_logo_url if practical

Do not make views too complex if application-level fallback is simpler.

Avoid deep nested selects on list pages.
Keep list pages fast and flat.

==================================================
11. Update UI: Company Detail
==================================================

On Company Detail page:

Add a simple Logo/Assets block.

Display:
- current logo preview using fallback
- current source:
  - R2
  - external
  - legacy URL
  - placeholder
- upload new logo button/input
- upload status/errors

On successful upload:
- upload to R2 public bucket
- insert files row
- update companies.primary_logo_file_id
- refresh display

Do not remove old company_logo_url.

==================================================
12. Update UI: Brand Detail if present
==================================================

If Brand Detail page exists:

Add simple Brand Logo upload.

On successful upload:
- upload to R2 public bucket
- insert files row
- update brands.primary_logo_file_id
- refresh display

If no Brand Detail page exists, skip or add TODO.

==================================================
13. Update UI: Participation Detail
==================================================

On Participation Detail page:

Add or update Materials/Assets block.

Display:
- resolved logo preview:
  - participation-specific logo if present
  - else company logo
  - else legacy
- upload participation-specific logo
- list uploaded files for this participation
- upload participation material

Material list columns:
- file name
- category
- status
- source/provider
- public link if available
- created_at

Upload material form:
- file input
- category select:
  - brochure
  - company_profile
  - product_photo
  - social_media_material
  - press_release
  - other

Keep UI simple.

==================================================
14. Update SMM Workspace
==================================================

Update SMM page so it uses files metadata/fallback logic.

SMM workspace should show:

- company name
- booth numbers
- website
- social links
- logo status:
  - missing
  - ready
- materials status:
  - missing
  - received
  - ready if possible
- logo link
- materials count or links
- SMM status
- next task
- publication URL

Rules:
- Existing external logos must still display.
- Newly uploaded R2 logos must display.
- Do not load deep nested relational trees.
- Keep SMM page using flat views or light queries.

==================================================
15. Public vs private files
==================================================

For this iteration:

Public files:
- company logos
- brand logos
- participation logos
- public brochures
- product photos
- SMM materials
- public event documents

Private files:
- contracts
- invoices
- payment proofs
- technical documents
- stand designs
- insurance
- internal documents

In this iteration:
- implement upload UI mainly for public logos/materials.
- create private bucket support in helpers.
- private signed URL UI may be documented as TODO unless easy.

Do not expose private bucket publicly.
Do not use R2_PUBLIC_BASE_URL for private files.

==================================================
16. Security and auth
==================================================

Do not expose R2 secrets to the browser.

Server-side only:
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_ENDPOINT

Client-side may receive only:
- generated public URLs for public files
- returned metadata after upload

If the project already has role checks:
- super_admin and event_manager can upload all assets
- smm_manager can upload/view public SMM materials
- sales_manager/sales can view company assets but not necessarily private documents

If role checks are not fully implemented:
- add TODO comments
- keep upload route server-side
- do not block the MVP unless current auth helpers are clear

==================================================
17. Documentation
==================================================

Add a new doc:

docs/FILES_AND_R2.md

Include:

- why we moved uploads to Cloudflare R2
- buckets:
  - exhibition-public-assets
  - exhibition-private-files
- env variables:
  - R2_ACCOUNT_ID
  - R2_ENDPOINT
  - R2_ACCESS_KEY_ID
  - R2_SECRET_ACCESS_KEY
  - R2_PUBLIC_BUCKET
  - R2_PRIVATE_BUCKET
  - R2_PUBLIC_BASE_URL
  - DEFAULT_ORGANIZATION_ID
  - DEFAULT_ORGANIZATION_SLUG
- public vs private files
- R2 path conventions
- files table purpose
- legacy URL migration behavior
- logo fallback logic
- how to change public asset domain later
- do not hardcode assets.chat-admin.online
- future TODO:
  - direct browser upload via presigned URLs
  - private signed download URLs
  - move from single-tenant default org to full tenant-aware UI

==================================================
18. Vercel/Deployment notes
==================================================

Update .env.example with placeholders:

R2_ACCOUNT_ID=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=exhibition-public-assets
R2_PRIVATE_BUCKET=exhibition-private-files
R2_PUBLIC_BASE_URL=
DEFAULT_ORGANIZATION_ID=
DEFAULT_ORGANIZATION_SLUG=

Do not commit real secrets.

If DEPLOYMENT_VERCEL.md exists, add a short section:
- add R2 env vars in Vercel Project Settings
- R2 secrets are server-side only
- R2_PUBLIC_BASE_URL can be changed later when asset domain changes

==================================================
19. Build and test
==================================================

After implementation:

Run:
- npm run build
- npm run lint if available
- npm run typecheck if available

Test manually:

1. Existing company logos still display from legacy URLs.
2. Existing brand logos still display from legacy URLs.
3. Company logo upload works and creates:
   - R2 object in exhibition-public-assets
   - files row
   - companies.primary_logo_file_id
4. Participation logo upload works and creates:
   - R2 object
   - files row
   - participations.public_logo_file_id
5. Participation material upload works and creates:
   - R2 object
   - files row
   - visible material on Participation Detail
6. SMM Workspace shows logo/material status correctly.
7. No R2 secret appears in client bundle.
8. No hardcoded assets.chat-admin.online in logic.
9. Public URLs are generated from R2_PUBLIC_BASE_URL.
10. Legacy fields are not removed.

Expected result:
The CRM keeps working with existing Strapi/external logos and materials, but all new uploads go to Cloudflare R2. Supabase stores file metadata in a SaaS-ready files table. The architecture supports future multi-tenant organizers while still working for the current single-tenant MVP.