import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function fetchCompanyEventIds(supabase: SupabaseClient<Database>, companyId: string) {
  const { data } = await supabase.from("participations").select("event_id").eq("company_id", companyId);

  return [...new Set((data ?? []).map((row) => row.event_id).filter((eventId): eventId is string => Boolean(eventId)))];
}
