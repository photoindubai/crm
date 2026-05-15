create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  event_name text not null,
  event_slug text unique,
  venue_name text,
  city text,
  country text,
  start_date date,
  end_date date,
  build_up_start timestamptz,
  build_up_end timestamptz,
  dismantling_start timestamptz,
  dismantling_end timestamptz,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
  add column if not exists organization_id uuid references public.organizations(id),
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists status text default 'active';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (
    role = any (
      array[
        'super_admin',
        'event_manager',
        'smm_manager',
        'sales_manager',
        'sales',
        'marketing',
        'ops'
      ]::text[]
    )
  );

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  company_name text not null,
  legal_name text,
  website text,
  description text,
  country text,
  city text,
  company_logo_url text,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  youtube_url text,
  telegram_url text,
  other_social_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  position text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  role text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  unique (company_id, contact_id, role)
);

create table if not exists public.participations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  participation_type text,
  status text,
  package_name text,
  sales_owner_id uuid references public.profiles(id),
  booking_status text,
  payment_status text,
  profile_status text,
  materials_status text,
  logistics_status text,
  smm_status text,
  internal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (event_id, company_id)
);

create table if not exists public.booths (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  booth_number text not null,
  hall text,
  zone text,
  area_sqm numeric,
  booth_type text,
  status text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (event_id, booth_number)
);

create table if not exists public.booth_assignments (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid references public.participations(id) on delete cascade,
  booth_id uuid references public.booths(id) on delete cascade,
  assigned_at timestamptz default now(),
  notes text,
  unique (participation_id, booth_id)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  brand_name text not null,
  brand_description text,
  brand_logo_url text,
  website text,
  country text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.company_brands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  created_at timestamptz default now(),
  unique (company_id, brand_id)
);

create table if not exists public.participation_brands (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid references public.participations(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  display_on_website boolean default true,
  priority integer,
  created_at timestamptz default now(),
  unique (participation_id, brand_id)
);

create table if not exists public.participation_logistics (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid references public.participations(id) on delete cascade unique,
  badges_status text,
  room_asset_status text,
  check_in_status text,
  conference_status text,
  furniture_status text,
  electricity_status text,
  internet_status text,
  stand_design_status text,
  fascia_status text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.exhibitor_materials (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid references public.participations(id) on delete cascade,
  material_type text,
  title text,
  url text,
  status text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.smm_tasks (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid references public.participations(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  task_type text,
  title text,
  description text,
  status text,
  due_date date,
  platform text,
  publication_url text,
  published_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  participation_id uuid references public.participations(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  title text not null,
  description text,
  status text,
  priority text,
  due_date date,
  task_category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  participation_id uuid references public.participations(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  created_by uuid references public.profiles(id),
  note_type text,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  actor_id uuid references public.profiles(id),
  entity_type text,
  entity_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz default now()
);

insert into public.organizations (name, slug)
values ('High End & Smart Home Show', 'hesh')
on conflict (slug) do update set
  name = excluded.name,
  updated_at = now();

insert into public.events (
  organization_id,
  event_name,
  event_slug,
  venue_name,
  city,
  country,
  start_date,
  end_date,
  status
)
select
  id,
  'High End & Smart Home Show 2026',
  'hesh-2026',
  'Radisson RED Hotel, Dubai Silicon Oasis',
  'Dubai',
  'United Arab Emirates',
  date '2026-09-24',
  date '2026-09-26',
  'planning'
from public.organizations
where slug = 'hesh'
on conflict (event_slug) do update set
  event_name = excluded.event_name,
  venue_name = excluded.venue_name,
  city = excluded.city,
  country = excluded.country,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  status = excluded.status,
  updated_at = now();

update public.profiles
set organization_id = (select id from public.organizations where slug = 'hesh')
where organization_id is null;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'super_admin', false)
$$;

create or replace function public.can_access_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_super_admin()
    or public.current_profile_organization_id() = target_organization_id,
    false
  )
$$;

create or replace function public.can_access_participation(target_participation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participations p
    where p.id = target_participation_id
      and public.can_access_organization(p.organization_id)
  )
$$;

create or replace function public.create_updated_at_trigger(target_table regclass)
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists set_updated_at on %s', target_table);
  execute format(
    'create trigger set_updated_at before update on %s for each row execute function public.set_updated_at()',
    target_table
  );
end;
$$;

select public.create_updated_at_trigger('public.organizations');
select public.create_updated_at_trigger('public.events');
select public.create_updated_at_trigger('public.profiles');
select public.create_updated_at_trigger('public.companies');
select public.create_updated_at_trigger('public.contacts');
select public.create_updated_at_trigger('public.participations');
select public.create_updated_at_trigger('public.booths');
select public.create_updated_at_trigger('public.brands');
select public.create_updated_at_trigger('public.participation_logistics');
select public.create_updated_at_trigger('public.exhibitor_materials');
select public.create_updated_at_trigger('public.smm_tasks');
select public.create_updated_at_trigger('public.tasks');

drop function public.create_updated_at_trigger(regclass);

create index if not exists events_organization_id_idx on public.events(organization_id);
create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists companies_organization_id_idx on public.companies(organization_id);
create index if not exists contacts_organization_id_idx on public.contacts(organization_id);
create index if not exists participations_organization_id_idx on public.participations(organization_id);
create index if not exists participations_event_id_idx on public.participations(event_id);
create index if not exists participations_company_id_idx on public.participations(company_id);
create index if not exists booths_event_id_idx on public.booths(event_id);
create index if not exists brands_organization_id_idx on public.brands(organization_id);
create index if not exists tasks_organization_id_idx on public.tasks(organization_id);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists smm_tasks_participation_id_idx on public.smm_tasks(participation_id);
create index if not exists exhibitor_materials_participation_id_idx on public.exhibitor_materials(participation_id);

alter table public.organizations enable row level security;
alter table public.events enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.company_contacts enable row level security;
alter table public.participations enable row level security;
alter table public.booths enable row level security;
alter table public.booth_assignments enable row level security;
alter table public.brands enable row level security;
alter table public.company_brands enable row level security;
alter table public.participation_brands enable row level security;
alter table public.participation_logistics enable row level security;
alter table public.exhibitor_materials enable row level security;
alter table public.smm_tasks enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.activity_log enable row level security;

create policy organizations_org_access on public.organizations
  for all to authenticated
  using (public.can_access_organization(id))
  with check (public.can_access_organization(id));

create policy events_org_access on public.events
  for all to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

create policy companies_org_access on public.companies
  for all to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

create policy contacts_org_access on public.contacts
  for all to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

create policy participations_org_access on public.participations
  for all to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

create policy brands_org_access on public.brands
  for all to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

create policy tasks_org_access on public.tasks
  for all to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

create policy notes_org_access on public.notes
  for all to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

create policy activity_log_org_access on public.activity_log
  for select to authenticated
  using (public.can_access_organization(organization_id));

create policy company_contacts_org_access on public.company_contacts
  for all to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and public.can_access_organization(c.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and public.can_access_organization(c.organization_id)
    )
  );

create policy booths_event_org_access on public.booths
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.can_access_organization(e.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.can_access_organization(e.organization_id)
    )
  );

create policy booth_assignments_participation_access on public.booth_assignments
  for all to authenticated
  using (public.can_access_participation(participation_id))
  with check (public.can_access_participation(participation_id));

create policy company_brands_org_access on public.company_brands
  for all to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and public.can_access_organization(c.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and public.can_access_organization(c.organization_id)
    )
  );

create policy participation_brands_participation_access on public.participation_brands
  for all to authenticated
  using (public.can_access_participation(participation_id))
  with check (public.can_access_participation(participation_id));

create policy participation_logistics_participation_access on public.participation_logistics
  for all to authenticated
  using (public.can_access_participation(participation_id))
  with check (public.can_access_participation(participation_id));

create policy exhibitor_materials_participation_access on public.exhibitor_materials
  for all to authenticated
  using (public.can_access_participation(participation_id))
  with check (public.can_access_participation(participation_id));

create policy smm_tasks_participation_access on public.smm_tasks
  for all to authenticated
  using (public.can_access_participation(participation_id))
  with check (public.can_access_participation(participation_id));

