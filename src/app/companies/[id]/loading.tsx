import { AppShell } from "@/components/app-shell";

export default function CompanyDetailLoading() {
  return (
    <AppShell title="Company">
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg border border-border bg-white" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-white" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-40 animate-pulse rounded-lg border border-border bg-white" />
          <div className="h-40 animate-pulse rounded-lg border border-border bg-white" />
        </div>
      </div>
    </AppShell>
  );
}
