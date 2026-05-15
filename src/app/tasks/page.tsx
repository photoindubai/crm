import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

const PAGE_SIZE = 50;

type TaskListRow = Database["public"]["Views"]["task_list_view"]["Row"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const page = getPageParam(params);
  const status = getStringParam(params, "status")?.trim() ?? "";
  const assignedTo = getStringParam(params, "assigned_to")?.trim() ?? "";
  const sort = getStringParam(params, "sort") === "due_desc" ? "due_desc" : "due_asc";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createSupabaseAdminClient();
  let request = supabase
    .from("task_list_view")
    .select("*", { count: "exact" })
    .order("due_date", { ascending: sort === "due_asc", nullsFirst: false })
    .range(from, to);

  if (status) {
    request = request.eq("status", status);
  }

  if (assignedTo) {
    request = request.eq("assigned_to", assignedTo);
  }

  const { data, error, count } = await request;

  if (error) {
    throw new Error(error.message);
  }

  const tasks = data ?? [];

  return (
    <AppShell title="Tasks">
      <form className="mb-4 grid gap-2 md:grid-cols-[180px_1fr_180px_auto_auto]">
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          name="assigned_to"
          defaultValue={assignedTo}
          placeholder="Assigned user id"
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
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
              <th className="w-[28%] px-4 py-3 font-semibold">Task</th>
              <th className="w-[22%] px-4 py-3 font-semibold">Company</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Status</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Priority</th>
              <th className="w-[14%] px-4 py-3 font-semibold">Due date</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.length > 0 ? (
              tasks.map((task) => <TaskRow key={task.task_id} task={task} />)
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count ?? 0}
          basePath="/tasks"
          params={{
            status: status || undefined,
            assigned_to: assignedTo || undefined,
            sort: sort === "due_desc" ? sort : undefined,
          }}
        />
      </div>
    </AppShell>
  );
}

function TaskRow({ task }: { task: TaskListRow }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <div className="truncate font-medium">{task.title}</div>
        <div className="truncate text-xs text-muted-foreground">{task.category ?? "No category"}</div>
      </td>
      <td className="px-4 py-4">
        {task.company_id ? (
          <Link href={`/companies/${task.company_id}`} className="truncate hover:text-primary">
            {task.company_name ?? "Unknown company"}
          </Link>
        ) : (
          <span className="text-muted-foreground">No company</span>
        )}
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={task.status} />
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={task.priority} />
      </td>
      <td className="px-4 py-4 text-muted-foreground">{task.due_date ?? "No due date"}</td>
      <td className="px-4 py-4 text-muted-foreground">{task.assigned_to ?? "Unassigned"}</td>
    </tr>
  );
}
