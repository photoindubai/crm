alter table public.companies
  add column if not exists address text,
  add column if not exists company_phone text,
  add column if not exists company_email text;

alter table public.participations
  add column if not exists display_name text;

update public.participations p
set display_name = c.company_name
from public.companies c
where p.company_id = c.id
  and nullif(p.display_name, '') is null;

create table if not exists public.event_sections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  slug text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (event_id, slug)
);

create table if not exists public.event_program_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  section_id uuid references public.event_sections(id) on delete set null,
  title text not null,
  item_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue text,
  description text,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.participation_contacts (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  role text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  unique (participation_id, contact_id, role)
);

create table if not exists public.action_templates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  action_type text,
  channel text,
  is_required boolean default true,
  default_due_offset_days integer,
  sort_order integer default 0,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text,
  priority text,
  due_date date,
  action_type text,
  channel text,
  is_required boolean default false,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  source_template_id uuid references public.action_templates(id) on delete set null,
  external_url text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.action_subjects (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  participation_id uuid references public.participations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  created_at timestamptz default now(),
  constraint action_subjects_one_target_check
    check (num_nonnulls(event_id, company_id, participation_id, contact_id) = 1)
);

create table if not exists public.action_recipients (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  participation_id uuid references public.participations(id) on delete cascade,
  created_at timestamptz default now()
);

create unique index if not exists action_subjects_action_event_uidx
  on public.action_subjects(action_id, event_id)
  where event_id is not null;

create unique index if not exists action_subjects_action_company_uidx
  on public.action_subjects(action_id, company_id)
  where company_id is not null;

create unique index if not exists action_subjects_action_participation_uidx
  on public.action_subjects(action_id, participation_id)
  where participation_id is not null;

create unique index if not exists action_subjects_action_contact_uidx
  on public.action_subjects(action_id, contact_id)
  where contact_id is not null;

create unique index if not exists action_recipients_action_contact_context_uidx
  on public.action_recipients(
    action_id,
    contact_id,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(participation_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists event_sections_event_id_idx on public.event_sections(event_id);
create index if not exists event_program_items_event_id_idx on public.event_program_items(event_id);
create index if not exists event_program_items_section_id_idx on public.event_program_items(section_id);
create index if not exists participation_contacts_participation_id_idx on public.participation_contacts(participation_id);
create index if not exists participation_contacts_contact_id_idx on public.participation_contacts(contact_id);
create index if not exists action_templates_event_id_idx on public.action_templates(event_id);
create index if not exists action_templates_status_idx on public.action_templates(status);
create index if not exists actions_organization_id_idx on public.actions(organization_id);
create index if not exists actions_status_idx on public.actions(status);
create index if not exists actions_assigned_to_idx on public.actions(assigned_to);
create index if not exists actions_due_date_idx on public.actions(due_date);
create index if not exists actions_action_type_idx on public.actions(action_type);
create index if not exists actions_channel_idx on public.actions(channel);
create index if not exists action_subjects_action_id_idx on public.action_subjects(action_id);
create index if not exists action_subjects_event_id_idx on public.action_subjects(event_id);
create index if not exists action_subjects_company_id_idx on public.action_subjects(company_id);
create index if not exists action_subjects_participation_id_idx on public.action_subjects(participation_id);
create index if not exists action_subjects_contact_id_idx on public.action_subjects(contact_id);
create index if not exists action_recipients_action_id_idx on public.action_recipients(action_id);
create index if not exists action_recipients_contact_id_idx on public.action_recipients(contact_id);
create index if not exists action_recipients_company_id_idx on public.action_recipients(company_id);
create index if not exists action_recipients_participation_id_idx on public.action_recipients(participation_id);

create or replace function public.ensure_participation_contact_belongs_to_company()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.participations p
    join public.company_contacts cc on cc.company_id = p.company_id
    where p.id = new.participation_id
      and cc.contact_id = new.contact_id
  ) then
    raise exception 'Participation contact must be linked to the participant company';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_participation_contact_company on public.participation_contacts;
create trigger ensure_participation_contact_company
before insert or update on public.participation_contacts
for each row execute function public.ensure_participation_contact_belongs_to_company();

create or replace function public.ensure_action_recipient_context()
returns trigger
language plpgsql
as $$
begin
  if new.participation_id is not null and not exists (
    select 1
    from public.participation_contacts pc
    where pc.participation_id = new.participation_id
      and pc.contact_id = new.contact_id
  ) then
    raise exception 'Action recipient contact must be linked to the participation';
  end if;

  if new.company_id is not null and not exists (
    select 1
    from public.company_contacts cc
    where cc.company_id = new.company_id
      and cc.contact_id = new.contact_id
  ) then
    raise exception 'Action recipient contact must be linked to the company';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_action_recipient_context on public.action_recipients;
create trigger ensure_action_recipient_context
before insert or update on public.action_recipients
for each row execute function public.ensure_action_recipient_context();

drop trigger if exists set_updated_at on public.event_sections;
create trigger set_updated_at before update on public.event_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.event_program_items;
create trigger set_updated_at before update on public.event_program_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.action_templates;
create trigger set_updated_at before update on public.action_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.actions;
create trigger set_updated_at before update on public.actions
for each row execute function public.set_updated_at();

insert into public.participation_contacts (
  participation_id,
  contact_id,
  role,
  is_primary,
  created_at
)
select
  p.id,
  cc.contact_id,
  cc.role,
  cc.is_primary,
  coalesce(cc.created_at, now())
from public.participations p
join public.company_contacts cc on cc.company_id = p.company_id
where cc.contact_id is not null
on conflict (participation_id, contact_id, role) do nothing;

insert into public.actions (
  id,
  organization_id,
  title,
  description,
  status,
  priority,
  due_date,
  action_type,
  channel,
  is_required,
  assigned_to,
  created_by,
  completed_at,
  created_at,
  updated_at
)
select
  t.id,
  coalesce(t.organization_id, p.organization_id, c.organization_id, e.organization_id),
  t.title,
  t.description,
  coalesce(t.status, 'open'),
  t.priority,
  t.due_date,
  coalesce(t.task_category, 'task'),
  null::text,
  false,
  t.assigned_to,
  t.created_by,
  t.completed_at,
  coalesce(t.created_at, now()),
  coalesce(t.updated_at, t.created_at, now())
from public.tasks t
left join public.participations p on p.id = t.participation_id
left join public.companies c on c.id = t.company_id
left join public.events e on e.id = t.event_id
on conflict (id) do nothing;

insert into public.actions (
  id,
  organization_id,
  title,
  description,
  status,
  priority,
  due_date,
  action_type,
  channel,
  is_required,
  assigned_to,
  external_url,
  completed_at,
  created_at,
  updated_at
)
select
  st.id,
  p.organization_id,
  coalesce(nullif(st.title, ''), nullif(st.task_type, ''), 'SMM task'),
  st.description,
  coalesce(st.status, 'not_started'),
  null::text,
  st.due_date,
  'smm',
  st.platform,
  false,
  st.assigned_to,
  st.publication_url,
  st.published_at,
  coalesce(st.created_at, now()),
  coalesce(st.updated_at, st.created_at, now())
from public.smm_tasks st
join public.participations p on p.id = st.participation_id
on conflict (id) do nothing;

insert into public.action_subjects (action_id, event_id)
select t.id, t.event_id
from public.tasks t
where t.event_id is not null
on conflict do nothing;

insert into public.action_subjects (action_id, company_id)
select t.id, t.company_id
from public.tasks t
where t.company_id is not null
on conflict do nothing;

insert into public.action_subjects (action_id, participation_id)
select t.id, t.participation_id
from public.tasks t
where t.participation_id is not null
on conflict do nothing;

insert into public.action_subjects (action_id, participation_id)
select st.id, st.participation_id
from public.smm_tasks st
where st.participation_id is not null
on conflict do nothing;

alter table public.event_sections enable row level security;
alter table public.event_program_items enable row level security;
alter table public.participation_contacts enable row level security;
alter table public.action_templates enable row level security;
alter table public.actions enable row level security;
alter table public.action_subjects enable row level security;
alter table public.action_recipients enable row level security;

drop policy if exists event_sections_event_org_access on public.event_sections;
create policy event_sections_event_org_access on public.event_sections
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

drop policy if exists event_program_items_event_org_access on public.event_program_items;
create policy event_program_items_event_org_access on public.event_program_items
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

drop policy if exists participation_contacts_participation_access on public.participation_contacts;
create policy participation_contacts_participation_access on public.participation_contacts
  for all to authenticated
  using (public.can_access_participation(participation_id))
  with check (public.can_access_participation(participation_id));

drop policy if exists action_templates_event_org_access on public.action_templates;
create policy action_templates_event_org_access on public.action_templates
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

drop policy if exists actions_org_access on public.actions;
create policy actions_org_access on public.actions
  for all to authenticated
  using (public.can_access_organization(organization_id))
  with check (public.can_access_organization(organization_id));

drop policy if exists action_subjects_action_org_access on public.action_subjects;
create policy action_subjects_action_org_access on public.action_subjects
  for all to authenticated
  using (
    exists (
      select 1 from public.actions a
      where a.id = action_id
        and public.can_access_organization(a.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.actions a
      where a.id = action_id
        and public.can_access_organization(a.organization_id)
    )
  );

drop policy if exists action_recipients_action_org_access on public.action_recipients;
create policy action_recipients_action_org_access on public.action_recipients
  for all to authenticated
  using (
    exists (
      select 1 from public.actions a
      where a.id = action_id
        and public.can_access_organization(a.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.actions a
      where a.id = action_id
        and public.can_access_organization(a.organization_id)
    )
  );

create or replace view public.action_list_view as
select
  a.id as action_id,
  a.title,
  a.description,
  a.status,
  a.priority,
  a.due_date,
  a.action_type,
  a.channel,
  a.is_required,
  a.assigned_to,
  a.created_by,
  a.external_url,
  a.completed_at,
  subject_summary.subject_summary,
  subject_summary.event_id,
  ev.event_name,
  subject_summary.company_id,
  c.company_name,
  subject_summary.participation_id,
  coalesce(p.display_name, pc.company_name) as participation_name,
  subject_summary.contact_id,
  nullif(concat_ws(' ', ct.first_name, ct.last_name), '') as contact_name
from public.actions a
left join lateral (
  select
    min(s.event_id::text)::uuid as event_id,
    min(coalesce(s.company_id, pp.company_id)::text)::uuid as company_id,
    min(s.participation_id::text)::uuid as participation_id,
    min(s.contact_id::text)::uuid as contact_id,
    string_agg(
      case
        when s.event_id is not null then 'event'
        when s.company_id is not null then 'company'
        when s.participation_id is not null then 'participation'
        when s.contact_id is not null then 'contact'
      end,
      ', '
      order by s.created_at
    ) as subject_summary
  from public.action_subjects s
  left join public.participations pp on pp.id = s.participation_id
  where s.action_id = a.id
) subject_summary on true
left join public.events ev on ev.id = subject_summary.event_id
left join public.companies c on c.id = subject_summary.company_id
left join public.participations p on p.id = subject_summary.participation_id
left join public.companies pc on pc.id = p.company_id
left join public.contacts ct on ct.id = subject_summary.contact_id;

create or replace view public.company_action_list_view as
select distinct
  a.id as action_id,
  a.title,
  a.description,
  a.status,
  a.priority,
  a.due_date,
  a.action_type,
  a.channel,
  a.is_required,
  a.assigned_to,
  coalesce(s.company_id, p.company_id, ar.company_id, rp.company_id) as company_id,
  c.company_name,
  coalesce(s.participation_id, ar.participation_id) as participation_id
from public.actions a
join public.action_subjects s on s.action_id = a.id
left join public.participations p on p.id = s.participation_id
left join public.action_recipients ar on ar.action_id = a.id
left join public.participations rp on rp.id = ar.participation_id
left join public.companies c on c.id = coalesce(s.company_id, p.company_id, ar.company_id, rp.company_id)
where coalesce(s.company_id, p.company_id, ar.company_id, rp.company_id) is not null;

create or replace view public.participation_action_list_view as
select distinct
  a.id as action_id,
  a.title,
  a.description,
  a.status,
  a.priority,
  a.due_date,
  a.action_type,
  a.channel,
  a.is_required,
  a.assigned_to,
  coalesce(s.participation_id, ar.participation_id) as participation_id,
  coalesce(p.event_id, rp.event_id) as event_id,
  coalesce(p.company_id, rp.company_id) as company_id
from public.actions a
left join public.action_subjects s on s.action_id = a.id
left join public.participations p on p.id = s.participation_id
left join public.action_recipients ar on ar.action_id = a.id
left join public.participations rp on rp.id = ar.participation_id
where coalesce(s.participation_id, ar.participation_id) is not null;

create or replace view public.event_action_list_view as
select distinct
  a.id as action_id,
  a.title,
  a.description,
  a.status,
  a.priority,
  a.due_date,
  a.action_type,
  a.channel,
  a.is_required,
  a.assigned_to,
  s.event_id,
  e.event_name
from public.actions a
join public.action_subjects s on s.action_id = a.id
join public.events e on e.id = s.event_id
where s.event_id is not null;

create or replace view public.contact_action_list_view as
select distinct
  a.id as action_id,
  a.title,
  a.description,
  a.status,
  a.priority,
  a.due_date,
  a.action_type,
  a.channel,
  a.is_required,
  a.assigned_to,
  coalesce(s.contact_id, ar.contact_id, cc.contact_id, pc.contact_id) as contact_id,
  nullif(concat_ws(' ', ct.first_name, ct.last_name), '') as contact_name,
  coalesce(s.company_id, ar.company_id, cc.company_id, p.company_id) as company_id,
  coalesce(s.participation_id, ar.participation_id, pc.participation_id) as participation_id
from public.actions a
left join public.action_subjects s on s.action_id = a.id
left join public.action_recipients ar on ar.action_id = a.id
left join public.company_contacts cc on cc.company_id = s.company_id
left join public.participation_contacts pc on pc.participation_id = s.participation_id
left join public.participations p on p.id = pc.participation_id
left join public.contacts ct on ct.id = coalesce(s.contact_id, ar.contact_id, cc.contact_id, pc.contact_id)
where coalesce(s.contact_id, ar.contact_id, cc.contact_id, pc.contact_id) is not null;

create or replace view public.task_list_view as
select
  action_id as task_id,
  title,
  status,
  priority,
  due_date,
  company_id,
  company_name,
  participation_id,
  assigned_to,
  action_type as category
from public.action_list_view;
