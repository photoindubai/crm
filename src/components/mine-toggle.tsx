import Link from "next/link";

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * "All | Mine" toggle for list pages. Preserves the other query params and drops `page` so the
 * filter starts from page 1.
 */
export function MineToggle({
  basePath,
  params,
  active,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  active: boolean;
}) {
  const base = { ...params, page: undefined };
  const allHref = buildHref(basePath, { ...base, mine: undefined });
  const mineHref = buildHref(basePath, { ...base, mine: "1" });

  const itemClass = (selected: boolean) =>
    `inline-flex h-9 items-center px-3 text-sm font-medium ${
      selected ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:bg-muted"
    }`;

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      <Link href={allHref} className={itemClass(!active)}>
        All
      </Link>
      <Link href={mineHref} className={`${itemClass(active)} border-l border-border`}>
        Mine
      </Link>
    </div>
  );
}
