export type PageSearchParams = Record<string, string | string[] | undefined>;

export async function resolveSearchParams(searchParams?: PageSearchParams | Promise<PageSearchParams>) {
  return (await Promise.resolve(searchParams)) ?? {};
}

export function getStringParam(searchParams: PageSearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getPageParam(searchParams: PageSearchParams) {
  const rawPage = Number(getStringParam(searchParams, "page") ?? "1");
  return Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
}

