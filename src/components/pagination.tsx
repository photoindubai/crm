import Link from "next/link";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
};

export function Pagination({ page, pageSize, total, basePath, params = {} }: PaginationProps) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-between border-t border-border bg-white px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="flex gap-2">
        <PageLink
          href={buildHref(basePath, { ...params, page: String(page - 1) })}
          disabled={!hasPrevious}
        >
          Previous
        </PageLink>
        <PageLink href={buildHref(basePath, { ...params, page: String(page + 1) })} disabled={!hasNext}>
          Next
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground opacity-50">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
      {children}
    </Link>
  );
}

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

