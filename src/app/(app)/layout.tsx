import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/components/query-provider";
import { requireActiveProfile } from "@/lib/auth";
import { resolveOrganizationId } from "@/lib/org-id";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireActiveProfile();
  const orgId = resolveOrganizationId(profile.organization_id);

  return (
    <QueryProvider userId={user.id} orgId={orgId}>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
