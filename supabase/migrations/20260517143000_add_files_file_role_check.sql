alter table public.files
  drop constraint if exists files_file_role_check;

alter table public.files
  add constraint files_file_role_check check (
    file_role is null
    or file_role = any (
      array[
        'full',
        'thumb',
        'full_inverted',
        'thumb_inverted',
        'primary',
        'public',
        'legacy_external',
        'public_material'
      ]::text[]
    )
  );
