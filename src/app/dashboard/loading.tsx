import { AppShell } from "@/components/app-shell";

export default function DashboardLoading() {
  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-white" />
        ))}
      </div>
    </AppShell>
  );
}
