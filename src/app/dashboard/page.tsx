import { AppShell } from "@/components/app-shell";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const revalidate = 30;

export default async function DashboardPage() {
  const { profile } = await requireActiveProfile();

  const { companiesCount, participationsCount, openTasksCount, smmPendingCount } = await loadCached(
    {
      keyParts: ["dashboard", profile.organization_id],
      tags: [cacheTags.dashboard, cacheTags.companies, cacheTags.participations, cacheTags.actions, cacheTags.smm],
    },
    async () => {
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
          .from("actions")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(done,cancelled,published)"),
        supabase
          .from("actions")
          .select("id", { count: "exact", head: true })
          .eq("action_type", "smm")
          .not("status", "in", "(published,cancelled)"),
      ]);

      return {
        companiesCount: companiesCount ?? 0,
        participationsCount: participationsCount ?? 0,
        openTasksCount: openTasksCount ?? 0,
        smmPendingCount: smmPendingCount ?? 0,
      };
    },
  );

  const metrics = [
    { label: "Companies", value: companiesCount },
    { label: "Participations", value: participationsCount },
    { label: "Open actions", value: openTasksCount },
    { label: "SMM pending", value: smmPendingCount },
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
