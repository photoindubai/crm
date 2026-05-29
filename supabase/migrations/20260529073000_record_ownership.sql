-- Record ownership and attribution.
-- Adds a manually assignable owner (owner_id) and an auto-stamped author (created_by) to core
-- entities, indexes them for "my records" filtering, and exposes participation ownership in the
-- participation list view.
-- Backup taken before applying: /home/anton/projects/backups/mfasaowbvqntdbgojtvi_20260529T072524Z.dump

-- 1) Manually assignable owner on companies / contacts / brands.
alter table public.companies
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;
alter table public.contacts
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;
alter table public.brands
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;

-- 2) Auto-stamped author. actions/notes already have created_by.
alter table public.companies
  add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.contacts
  add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.brands
  add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.participations
  add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.events
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- 3) Indexes for ownership filters.
create index if not exists companies_owner_id_idx on public.companies(owner_id);
create index if not exists companies_created_by_idx on public.companies(created_by);
create index if not exists contacts_owner_id_idx on public.contacts(owner_id);
create index if not exists contacts_created_by_idx on public.contacts(created_by);
create index if not exists brands_owner_id_idx on public.brands(owner_id);
create index if not exists brands_created_by_idx on public.brands(created_by);
create index if not exists participations_sales_owner_id_idx on public.participations(sales_owner_id);
create index if not exists participations_created_by_idx on public.participations(created_by);
create index if not exists events_created_by_idx on public.events(created_by);
create index if not exists actions_assigned_to_idx on public.actions(assigned_to);

-- 4) Expose participation ownership/attribution in the list view used by /participations.
create or replace view public.participation_list_view as
select
  p.id as participation_id,
  p.event_id,
  p.company_id,
  c.company_name,
  c.company_logo_url as logo_url,
  coalesce(booths.booth_numbers, '') as booth_numbers,
  p.participation_type,
  p.status,
  p.package_name,
  p.payment_status,
  p.profile_status,
  p.logistics_status,
  nullif(concat_ws(' ', main_contact.first_name, main_contact.last_name), '') as main_contact_name,
  main_contact.email as main_contact_email,
  p.sales_owner_id,
  p.created_by
from public.participations p
left join public.companies c on c.id = p.company_id
left join lateral (
  select string_agg(b.booth_number, ', ' order by b.booth_number) as booth_numbers
  from public.booth_assignments ba
  join public.booths b on b.id = ba.booth_id
  where ba.participation_id = p.id
) booths on true
left join lateral (
  select
    ct.first_name,
    ct.last_name,
    ct.email
  from public.company_contacts cc
  join public.contacts ct on ct.id = cc.contact_id
  where cc.company_id = p.company_id
  order by cc.is_primary desc nulls last, cc.created_at asc nulls last, ct.created_at asc nulls last
  limit 1
) main_contact on true;
