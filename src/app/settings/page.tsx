import Link from "next/link";
import { Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireSuperAdmin();

  return (
    <AppShell title="Settings">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/settings/users"
          className="rounded-lg border border-border bg-white p-5 shadow-soft transition hover:border-primary"
        >
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted text-primary">
            <Users size={18} aria-hidden="true" />
          </div>
          <h2 className="text-sm font-semibold text-primary">Users</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Invite CRM users and manage their role and status.
          </p>
        </Link>
      </div>
    </AppShell>
  );
}
