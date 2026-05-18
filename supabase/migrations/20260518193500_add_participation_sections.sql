create table if not exists public.participation_sections (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations(id) on delete cascade,
  section_id uuid not null references public.event_sections(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (participation_id, section_id)
);

create index if not exists participation_sections_participation_id_idx
  on public.participation_sections(participation_id);

create index if not exists participation_sections_section_id_idx
  on public.participation_sections(section_id);
