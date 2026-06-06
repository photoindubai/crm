import type { Database } from "@/lib/supabase/database.types";

export type CompanyRow = Pick<
  Database["public"]["Tables"]["companies"]["Row"],
  "id" | "company_name" | "company_logo_url" | "website" | "owner_id"
>;

export type ParticipationWithEvent = Pick<
  Database["public"]["Tables"]["participations"]["Row"],
  "id" | "company_id" | "status" | "event_id"
> & {
  events: Pick<Database["public"]["Tables"]["events"]["Row"], "id" | "event_name"> | null;
};

export type ContactLink = Pick<
  Database["public"]["Tables"]["company_contacts"]["Row"],
  "company_id" | "is_primary" | "created_at"
> & {
  contacts: Pick<
    Database["public"]["Tables"]["contacts"]["Row"],
    "first_name" | "last_name" | "email" | "phone" | "created_at"
  > | null;
};

export type CompanyEvent = {
  eventId: string;
  eventName: string;
};

export type CompanyListItem = {
  company_id: string;
  company_name: string;
  logo_url: string | null;
  website: string | null;
  owner_id: string | null;
  main_contact_name: string | null;
  main_contact_email: string | null;
  main_contact_phone: string | null;
  participation_status: string | null;
  events: CompanyEvent[];
};

export type CompaniesClientListResult = {
  companies: CompanyListItem[];
  total: number;
  clientCacheEligible: boolean;
  message?: string;
};

export type CompaniesPaginatedResult = {
  companies: CompanyListItem[];
  count: number;
};

export const COMPANIES_PAGE_SIZE = 50;
