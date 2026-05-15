import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

const PAGE_SIZE = 50;

const filters = [
  { value: "", label: "All" },
  { value: "missing_logo", label: "Missing logo" },
  { value: "missing_description", label: "Missing description" },
  { value: "missing_socials", label: "Missing socials" },
  { value: "ready_materials", label: "Ready materials" },
  { value: "pending_smm", label: "Pending SMM" },
  { value: "published", label: "Published" },
];

type SmmWorkspaceRow = Database["public"]["Views"]["smm_workspace_view"]["Row"];

export default async function SmmPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const page = getPageParam(params);
  const filter = getStringParam(params, "filter")?.trim() ?? "";
  const query = getStringParam(params, "q")?.trim() ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createSupabaseAdminClient();
  let request = supabase
    .from("smm_workspace_view")
    .select("*", { count: "exact" })
    .order("company_name", { ascending: true })
    .range(from, to);

  if (query) {
    request = request.ilike("company_name", `%${query}%`);
  }

  if (filter === "missing_logo") {
    request = request.eq("logo_status", "missing");
  } else if (filter === "missing_description") {
    request = request.eq("description_status", "missing");
  } else if (filter === "missing_socials") {
    request = request.is("instagram_url", null).is("facebook_url", null).is("linkedin_url", null).is("youtube_url", null);
  } else if (filter === "ready_materials") {
    request = request.eq("materials_status", "ready");
  } else if (filter === "pending_smm") {
    request = request.not("smm_status", "in", "(published,cancelled)");
  } else if (filter === "published") {
    request = request.eq("smm_status", "published");
  }

  const { data, error, count } = await request;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  return (
    <AppShell title="SMM Workspace">
      <form className="mb-4 grid gap-2 md:grid-cols-[1fr_220px_auto_auto]">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search companies"
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
        <select
          name="filter"
          defaultValue={filter}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        >
          {filters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Apply
        </button>
        {query || filter ? (
          <Link href="/smm" className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm">
            Reset
          </Link>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-[23%] px-4 py-3 font-semibold">Company</th>
              <th className="w-[10%] px-4 py-3 font-semibold">Booth</th>
              <th className="w-[10%] px-4 py-3 font-semibold">Logo</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Description</th>
              <th className="w-[15%] px-4 py-3 font-semibold">Socials</th>
              <th className="w-[13%] px-4 py-3 font-semibold">Materials</th>
              <th className="w-[9%] px-4 py-3 font-semibold">SMM</th>
              <th className="w-[8%] px-4 py-3 font-semibold">Post</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length > 0 ? (
              rows.map((row) => <SmmRow key={row.participation_id} row={row} />)
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No SMM rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count ?? 0}
          basePath="/smm"
          params={{
            q: query || undefined,
            filter: filter || undefined,
          }}
        />
      </div>
    </AppShell>
  );
}

function SmmRow({ row }: { row: SmmWorkspaceRow }) {
  const socials = [
    row.instagram_url ? "Instagram" : null,
    row.facebook_url ? "Facebook" : null,
    row.linkedin_url ? "LinkedIn" : null,
    row.youtube_url ? "YouTube" : null,
    row.other_socials ? "Other" : null,
  ].filter(Boolean);

  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <Link href={`/companies/${row.company_id}`} className="block truncate font-medium hover:text-primary">
          {row.company_name}
        </Link>
        <div className="truncate text-xs text-muted-foreground">
          {row.website ? row.website.replace(/^https?:\/\//, "") : "No website"}
        </div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{row.booth_numbers || "No booth"}</td>
      <td className="px-4 py-4">
        {row.logo_url ? (
          <a href={row.logo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Ready
          </a>
        ) : (
          <StatusBadge value={row.logo_status} />
        )}
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={row.description_status} />
      </td>
      <td className="px-4 py-4 text-muted-foreground">{socials.length > 0 ? socials.join(", ") : "No socials"}</td>
      <td className="px-4 py-4">
        {row.materials_url ? (
          <a href={row.materials_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Open
          </a>
        ) : (
          <StatusBadge value={row.materials_status} />
        )}
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={row.smm_status} />
        <div className="mt-1 truncate text-xs text-muted-foreground">
          {row.next_task_title ?? row.next_task_due_date ?? ""}
        </div>
      </td>
      <td className="px-4 py-4">
        {row.last_post_url ? (
          <a href={row.last_post_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Open
          </a>
        ) : (
          <span className="text-muted-foreground">No post</span>
        )}
      </td>
    </tr>
  );
}
