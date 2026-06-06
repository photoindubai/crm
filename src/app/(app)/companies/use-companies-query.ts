"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { STALE_TIMES } from "@/lib/query/stale-times";
import type { CompaniesClientListResult } from "@/lib/loaders/companies-list.types";

async function fetchCompanies(): Promise<CompaniesClientListResult> {
  const response = await fetch("/api/crm/companies");
  if (!response.ok) {
    throw new Error("Failed to load companies");
  }
  return response.json();
}

export function useCompaniesQuery(orgId: string, initialData: CompaniesClientListResult) {
  return useQuery({
    queryKey: queryKeys.companies(orgId),
    queryFn: fetchCompanies,
    initialData,
    staleTime: STALE_TIMES.LIST_LONG,
    enabled: initialData.clientCacheEligible,
  });
}
