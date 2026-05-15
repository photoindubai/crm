create unique index if not exists companies_organization_source_appsheet_id_unique
  on public.companies(organization_id, source_appsheet_id);

create unique index if not exists contacts_organization_source_appsheet_id_unique
  on public.contacts(organization_id, source_appsheet_id);

create unique index if not exists brands_organization_source_appsheet_id_unique
  on public.brands(organization_id, source_appsheet_id);

create unique index if not exists company_contacts_source_appsheet_id_unique
  on public.company_contacts(source_appsheet_id);

create unique index if not exists participation_logistics_source_appsheet_id_unique
  on public.participation_logistics(source_appsheet_id);

create unique index if not exists exhibitor_materials_participation_title_unique
  on public.exhibitor_materials(participation_id, title);

