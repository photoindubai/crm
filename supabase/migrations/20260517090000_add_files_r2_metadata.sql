create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  participation_id uuid references public.participations(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  file_category text not null,
  file_role text,
  provider text not null default 'cloudflare_r2',
  bucket text not null,
  storage_path text,
  external_url text,
  public_url text,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  is_public boolean not null default false,
  source text,
  status text not null default 'uploaded',
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_provider_check check (provider = any (array['cloudflare_r2', 'supabase_storage', 'aws_s3', 'external']::text[])),
  constraint files_status_check check (status = any (array['uploaded', 'pending_review', 'approved', 'rejected', 'archived']::text[])),
  constraint files_entity_type_check check (
    entity_type = any (array['organization', 'company', 'event', 'participation', 'brand', 'smm_task', 'task', 'material']::text[])
  ),
  constraint files_bucket_provider_check check (
    (
      provider = 'cloudflare_r2'
      and bucket = any (array['exhibition-public-assets', 'exhibition-private-files']::text[])
    )
    or (
      provider = 'external'
      and bucket = 'external'
    )
    or (
      provider = any (array['supabase_storage', 'aws_s3']::text[])
      and length(trim(bucket)) > 0
    )
  )
);

create index if not exists files_organization_id_idx on public.files(organization_id);
create index if not exists files_event_id_idx on public.files(event_id);
create index if not exists files_company_id_idx on public.files(company_id);
create index if not exists files_participation_id_idx on public.files(participation_id);
create index if not exists files_brand_id_idx on public.files(brand_id);
create index if not exists files_entity_type_entity_id_idx on public.files(entity_type, entity_id);
create index if not exists files_file_category_idx on public.files(file_category);
create index if not exists files_status_idx on public.files(status);
create index if not exists files_provider_idx on public.files(provider);
create index if not exists files_bucket_idx on public.files(bucket);
create index if not exists files_created_at_idx on public.files(created_at);

alter table public.companies add column if not exists primary_logo_file_id uuid references public.files(id) on delete set null;
alter table public.brands add column if not exists primary_logo_file_id uuid references public.files(id) on delete set null;
alter table public.participations add column if not exists public_logo_file_id uuid references public.files(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_updated_at_public_files'
  ) then
    create trigger set_updated_at_public_files
      before update on public.files
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

alter table public.files enable row level security;

drop policy if exists files_select_organization_access on public.files;
drop policy if exists files_insert_organization_access on public.files;
drop policy if exists files_update_organization_access on public.files;
drop policy if exists files_delete_organization_access on public.files;

create policy files_select_organization_access on public.files
  for select
  to authenticated
  using (public.can_access_organization(organization_id));

create policy files_insert_organization_access on public.files
  for insert
  to authenticated
  with check (public.can_access_organization(organization_id));

create policy files_update_organization_access on public.files
  for update
  to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

create policy files_delete_organization_access on public.files
  for delete
  to authenticated
  using (public.can_access_organization(organization_id));
