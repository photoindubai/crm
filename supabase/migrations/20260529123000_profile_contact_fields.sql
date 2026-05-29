-- Profile contact fields + backfill from auth.users metadata.
-- Backup taken before applying: /home/anton/projects/backups/mfasaowbvqntdbgojtvi_20260529T092439Z.dump

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists position text,
  add column if not exists phone text;

-- Keep full_name in sync with first_name + last_name for legacy reads/display.
create or replace function public.profiles_sync_full_name()
returns trigger
language plpgsql
as $$
begin
  new.full_name := nullif(trim(concat_ws(' ', new.first_name, new.last_name)), '');
  return new;
end;
$$;

drop trigger if exists profiles_sync_full_name_trigger on public.profiles;
create trigger profiles_sync_full_name_trigger
  before insert or update of first_name, last_name
  on public.profiles
  for each row
  execute function public.profiles_sync_full_name();

-- Backfill email and names from auth.users (Google OAuth stores name/full_name in raw_user_meta_data).
with auth_data as (
  select
    u.id,
    u.email as auth_email,
    u.raw_user_meta_data as meta,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'given_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'first_name'), ''),
      nullif(
        split_part(
          coalesce(
            nullif(trim(u.raw_user_meta_data->>'name'), ''),
            nullif(trim(u.raw_user_meta_data->>'full_name'), '')
          ),
          ' ',
          1
        ),
        ''
      )
    ) as meta_first,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'family_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'last_name'), ''),
      case
        when coalesce(
          nullif(trim(u.raw_user_meta_data->>'name'), ''),
          nullif(trim(u.raw_user_meta_data->>'full_name'), '')
        ) like '% %'
        then trim(
          substring(
            coalesce(
              nullif(trim(u.raw_user_meta_data->>'name'), ''),
              nullif(trim(u.raw_user_meta_data->>'full_name'), '')
            )
            from position(
              ' ' in coalesce(
                nullif(trim(u.raw_user_meta_data->>'name'), ''),
                nullif(trim(u.raw_user_meta_data->>'full_name'), '')
              )
            ) + 1
          )
        )
        else null
      end
    ) as meta_last
  from auth.users u
)
update public.profiles p
set
  email = coalesce(nullif(trim(p.email), ''), ad.auth_email),
  first_name = coalesce(
    nullif(trim(p.first_name), ''),
    ad.meta_first,
    nullif(split_part(nullif(trim(p.full_name), ''), ' ', 1), '')
  ),
  last_name = coalesce(
    nullif(trim(p.last_name), ''),
    ad.meta_last,
    case
      when nullif(trim(p.full_name), '') like '% %'
      then trim(substring(p.full_name from position(' ' in p.full_name) + 1))
      else null
    end
  )
from auth_data ad
where ad.id = p.id;

-- Trigger only runs on insert/update of first_name/last_name; sync full_name for backfilled rows.
update public.profiles
set first_name = first_name
where first_name is not null or last_name is not null;

-- Users may update their own profile fields (role/status/org remain server-admin only).
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
