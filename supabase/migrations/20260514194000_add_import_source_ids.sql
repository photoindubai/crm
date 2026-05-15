alter table public.companies
  add column if not exists source_appsheet_id text;

alter table public.contacts
  add column if not exists source_appsheet_id text;

alter table public.brands
  add column if not exists source_appsheet_id text;

alter table public.company_contacts
  add column if not exists source_appsheet_id text;

alter table public.participation_logistics
  add column if not exists source_appsheet_id text;

create unique index if not exists companies_organization_source_appsheet_id_key
  on public.companies(organization_id, source_appsheet_id)
  where source_appsheet_id is not null;

create unique index if not exists contacts_organization_source_appsheet_id_key
  on public.contacts(organization_id, source_appsheet_id)
  where source_appsheet_id is not null;

create unique index if not exists brands_organization_source_appsheet_id_key
  on public.brands(organization_id, source_appsheet_id)
  where source_appsheet_id is not null;

create unique index if not exists company_contacts_source_appsheet_id_key
  on public.company_contacts(source_appsheet_id)
  where source_appsheet_id is not null;

create unique index if not exists participation_logistics_source_appsheet_id_key
  on public.participation_logistics(source_appsheet_id)
  where source_appsheet_id is not null;

