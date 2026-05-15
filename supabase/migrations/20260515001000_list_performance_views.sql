create index if not exists participations_status_idx
  on public.participations(status);

create index if not exists participations_participation_type_idx
  on public.participations(participation_type);

create index if not exists booth_assignments_booth_id_idx
  on public.booth_assignments(booth_id);

create index if not exists company_contacts_contact_id_idx
  on public.company_contacts(contact_id);

create index if not exists company_brands_brand_id_idx
  on public.company_brands(brand_id);

create index if not exists participation_brands_brand_id_idx
  on public.participation_brands(brand_id);

create index if not exists smm_tasks_status_idx
  on public.smm_tasks(status);

create index if not exists tasks_participation_id_idx
  on public.tasks(participation_id);

create index if not exists tasks_company_id_idx
  on public.tasks(company_id);

create index if not exists tasks_status_idx
  on public.tasks(status);

create index if not exists tasks_due_date_idx
  on public.tasks(due_date);

create or replace view public.company_list_view as
select
  c.id as company_id,
  c.company_name,
  c.company_logo_url as logo_url,
  c.country,
  c.city,
  c.website,
  p.event_id,
  p.status as participation_status,
  coalesce(booths.booth_numbers, '') as booth_numbers,
  nullif(concat_ws(' ', main_contact.first_name, main_contact.last_name), '') as main_contact_name,
  main_contact.email as main_contact_email,
  main_contact.phone as main_contact_phone
from public.companies c
left join public.participations p on p.company_id = c.id
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
    ct.email,
    ct.phone
  from public.company_contacts cc
  join public.contacts ct on ct.id = cc.contact_id
  where cc.company_id = c.id
  order by cc.is_primary desc nulls last, cc.created_at asc nulls last, ct.created_at asc nulls last
  limit 1
) main_contact on true;

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
  main_contact.email as main_contact_email
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

create or replace view public.smm_workspace_view as
select
  p.id as participation_id,
  p.event_id,
  p.company_id,
  c.company_name,
  c.website,
  c.company_logo_url as logo_url,
  materials.materials_url,
  c.description,
  coalesce(booths.booth_numbers, '') as booth_numbers,
  c.instagram_url,
  c.facebook_url,
  c.linkedin_url,
  c.youtube_url,
  concat_ws(', ', nullif(c.telegram_url, ''), nullif(c.other_social_url, '')) as other_socials,
  case when nullif(coalesce(c.company_logo_url, materials.logo_url), '') is null then 'missing' else 'ready' end as logo_status,
  case when nullif(c.description, '') is null then 'missing' else 'ready' end as description_status,
  coalesce(p.materials_status, materials.materials_status, 'missing') as materials_status,
  coalesce(p.smm_status, 'not_started') as smm_status,
  next_task.title as next_task_title,
  next_task.due_date as next_task_due_date,
  last_post.publication_url as last_post_url
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
    max(em.url) filter (where em.material_type = 'logo') as logo_url,
    max(em.url) filter (where em.material_type in ('folder', 'company_profile', 'social_media_kit', 'logo')) as materials_url,
    max(em.status) as materials_status
  from public.exhibitor_materials em
  where em.participation_id = p.id
) materials on true
left join lateral (
  select st.title, st.due_date
  from public.smm_tasks st
  where st.participation_id = p.id
    and coalesce(st.status, 'not_started') not in ('published', 'cancelled')
  order by st.due_date asc nulls last, st.created_at asc nulls last
  limit 1
) next_task on true
left join lateral (
  select st.publication_url
  from public.smm_tasks st
  where st.participation_id = p.id
    and nullif(st.publication_url, '') is not null
  order by st.published_at desc nulls last, st.updated_at desc nulls last
  limit 1
) last_post on true;

create or replace view public.task_list_view as
select
  t.id as task_id,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  t.company_id,
  coalesce(c.company_name, pc.company_name) as company_name,
  t.participation_id,
  t.assigned_to,
  t.task_category as category
from public.tasks t
left join public.companies c on c.id = t.company_id
left join public.participations p on p.id = t.participation_id
left join public.companies pc on pc.id = p.company_id;

