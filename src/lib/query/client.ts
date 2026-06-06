import { QueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/query/stale-times";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.LIST_LONG,
        gcTime: STALE_TIMES.GC_TIME,
        refetchOnWindowFocus: false,
      },
    },
  });
}
