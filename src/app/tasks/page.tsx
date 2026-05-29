import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { MineToggle } from "@/components/mine-toggle";
import { OwnerCell } from "@/components/owner-cell";
import { CACHE_TTL } from "@/lib/cache/ttl";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { getOrgUsers } from "@/lib/ownership.server";
import { userDisplayName, type OrgUser } from "@/lib/ownership";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 3600;

const PAGE_SIZE = 50;

type ActionListRow = Database["public"]["Views"]["action_list_view"]["Row"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();
  const orgId = profile.organization_id ?? "";

  const page = getPageParam(params);
  const status = getStringParam(params, "status")?.trim() ?? "";
  const assignedTo = getStringParam(params, "assigned_to")?.trim() ?? "";
  const mine = getStringParam(params, "mine") === "1";
  const sort = getStringParam(params, "sort") === "due_desc" ? "due_desc" : "due_asc";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const orgUsers = await getOrgUsers(orgId);
  const effectiveAssignedTo = mine ? profile.id : assignedTo;

  const { actions, count } = await loadCached(
    {
      keyParts: ["actions", orgId, page, status, effectiveAssignedTo, sort, mine ? "mine" : "all"],
      tags: [cacheTags.orgActions(orgId)],
      revalidateSeconds: CACHE_TTL.ACTIONS_SHORT,
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      let request = supabase
        .from("action_list_view")
        .select("*", { count: "exact" })
        .order("due_date", { ascending: sort === "due_asc", nullsFirst: false })
        .range(from, to);

      if (status) {
        request = request.eq("status", status);
      }

      if (effectiveAssignedTo) {
        request = request.eq("assigned_to", effectiveAssignedTo);
      }

      const { data, error, count } = await request;

      if (error) {
        throw new Error(error.message);
      }

      return {
        actions: data ?? [],
        count: count ?? 0,
      };
    },
  );

  return (
    <AppShell title="Actions">
      <div className="mb-4 flex justify-end">
        <MineToggle
          basePath="/tasks"
          params={{
            status: status || undefined,
            assigned_to: assignedTo || undefined,
            sort: sort === "due_desc" ? sort : undefined,
          }}
          active={mine}
        />
      </div>
      <form className="mb-4 grid gap-2 md:grid-cols-[180px_1fr_180px_auto_auto]">
        {mine ? <input type="hidden" name="mine" value="1" /> : null}
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          name="assigned_to"
          defaultValue={assignedTo}
          disabled={mine}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
        >
          <option value="">All assignees</option>
          {orgUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {userDisplayName(user.name, user.email)}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="due_asc">Due date asc</option>
          <option value="due_desc">Due date desc</option>
        </select>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Apply
        </button>
        {status || assignedTo || sort !== "due_asc" ? (
          <Link href="/tasks" className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm">
            Reset
          </Link>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-[28%] px-4 py-3 font-semibold">Action</th>
              <th className="w-[22%] px-4 py-3 font-semibold">Subject</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Status</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Type</th>
              <th className="w-[14%] px-4 py-3 font-semibold">Due date</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {actions.length > 0 ? (
              actions.map((action) => (
                <ActionRow
                  key={action.action_id}
                  action={action}
                  users={orgUsers}
                  currentUserId={profile.id}
                />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No actions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count}
          basePath="/tasks"
          params={{
            status: status || undefined,
            assigned_to: assignedTo || undefined,
            sort: sort === "due_desc" ? sort : undefined,
            mine: mine ? "1" : undefined,
          }}
        />
      </div>
    </AppShell>
  );
}

function ActionRow({
  action,
  users,
  currentUserId,
}: {
  action: ActionListRow;
  users: OrgUser[];
  currentUserId: string;
}) {
  const subjectHref = action.participation_id
    ? `/participations/${action.participation_id}`
    : action.company_id
      ? `/companies/${action.company_id}`
      : action.contact_id
        ? `/contacts/${action.contact_id}`
        : null;
  const subjectName = action.participation_name ?? action.company_name ?? action.contact_name ?? action.event_name;

  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <div className="truncate font-medium">{action.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {[action.action_type, action.channel, action.is_required ? "required" : null].filter(Boolean).join(" / ") ||
            "No type"}
        </div>
      </td>
      <td className="px-4 py-4">
        {subjectHref ? (
          <Link href={subjectHref} className="truncate hover:text-primary">
            {subjectName ?? "Unknown subject"}
          </Link>
        ) : (
          <span className="text-muted-foreground">No subject</span>
        )}
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={action.status} />
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={action.action_type ?? action.priority} />
      </td>
      <td className="px-4 py-4 text-muted-foreground">{action.due_date ?? "No due date"}</td>
      <td className="px-4 py-4">
        {action.action_id ? (
          <OwnerCell
            entity="action"
            recordId={action.action_id}
            ownerId={action.assigned_to}
            users={users}
            currentUserId={currentUserId}
          />
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </td>
    </tr>
  );
}
