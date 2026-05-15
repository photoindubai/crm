import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

