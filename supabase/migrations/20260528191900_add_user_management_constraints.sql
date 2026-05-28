-- User management hardening.
-- Standardize the profile status lifecycle and allow in-org audit writes to activity_log.
-- Backup taken before applying: /home/anton/projects/backups/mfasaowbvqntdbgojtvi_20260528T191855Z.dump

-- 1) Normalize any null statuses to 'active' before constraining.
update public.profiles set status = 'active' where status is null;

-- 2) Constrain profile status to the supported lifecycle values:
--    active   -> may access the CRM
--    invited  -> provisioned; upgraded to active at the first successful auth entry
--    disabled -> application-level deactivation (blocked everywhere)
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'invited', 'disabled'));

-- Keep the existing default.
alter table public.profiles alter column status set default 'active';

-- 3) Allow activity_log inserts for users within their organization.
--    User-management writes currently use the service role and bypass RLS; this policy supports
--    future in-app audit writes without weakening tenant isolation.
drop policy if exists activity_log_org_insert on public.activity_log;
create policy activity_log_org_insert
  on public.activity_log
  for insert
  to authenticated
  with check (public.can_access_organization(organization_id));
