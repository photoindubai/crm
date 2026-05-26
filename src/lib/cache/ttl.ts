export const CACHE_TTL = {
  ACTIONS_SHORT: 30,
  PARTICIPATIONS_MEDIUM: 300,
  SMM_MEDIUM: 300,
  DASHBOARD_MEDIUM: 300,
  LIST_LONG: 900,
  DETAIL_LONG: 900,
} as const;

/** Next.js route segment config requires a numeric literal, not a member expression. */
export const ROUTE_REVALIDATE_SECONDS = 3600;
