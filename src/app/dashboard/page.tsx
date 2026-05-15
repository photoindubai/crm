import { AppShell } from "@/components/app-shell";
import { requireActiveProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const revalidate = 30;

const pendingStatuses = ["published", "cancelled"];

export default async function DashboardPage() {
  await requireActiveProfile();

  const supabase = createSupabaseAdminClient();
  const [
    { count: companiesCount },
    { count: participationsCount },
    { count: openTasksCount },
    { count: smmPendingCount },
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("participations").select("id", { count: "exact", head: true }),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(done,cancelled)"),
    supabase
      .from("smm_tasks")
      .select("id", { count: "exact", head: true })
      .not("status", "in", `(${pendingStatuses.join(",")})`),
  ]);
  const metrics = [
    { label: "Companies", value: companiesCount ?? 0 },
    { label: "Participations", value: participationsCount ?? 0 },
    { label: "Open tasks", value: openTasksCount ?? 0 },
    { label: "SMM pending", value: smmPendingCount ?? 0 },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
