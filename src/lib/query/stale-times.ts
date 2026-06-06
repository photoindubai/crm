import { CACHE_TTL } from "@/lib/cache/ttl";

/** Client staleTime values in milliseconds (mirror server CACHE_TTL seconds). */
export const STALE_TIMES = {
  LIST_LONG: CACHE_TTL.LIST_LONG * 1000,
  GC_TIME: 60 * 60 * 1000,
} as const;
