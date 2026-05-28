import { AppShell } from "@/components/app-shell";
import { requireSuperAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";
import { InviteUserForm } from "./invite-user-form";
import { UserRow, type UserRowData } from "./user-row";

// User status/role must always be fresh: never serve a cached list here.
export const dynamic = "force-dynamic";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email" | "role" | "status" | "created_at" | "updated_at" | "organization_id"
>;

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toISOString().slice(0, 10);
}

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const notice = getStringParam(params, "notice");
  const error = getStringParam(params, "error");

  const { user, profile } = await requireSuperAdmin();
  const orgId = profile.organization_id ?? process.env.DEFAULT_ORGANIZATION_ID ?? "";

  const admin = createSupabaseAdminClient();

  const [{ data: organization }, { data: profiles }] = await Promise.all([
    admin.from("organizations").select("id,name").eq("id", orgId).maybeSingle(),
    admin
      .from("profiles")
      .select("id,full_name,email,role,status,created_at,updated_at,organization_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
  ]);

  const orgName = organization?.name ?? "—";
  const rows = (profiles ?? []) as ProfileRow[];
  const flash = getFlashMessage(notice, error);

  return (
    <AppShell title="Settings — Users">
      {flash ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            flash.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {flash.message}
        </div>
      ) : null}

      <section className="mb-6 rounded-lg border border-border bg-white p-4 shadow-soft">
        <h2 className="mb-1 text-sm font-semibold text-primary">Invite a CRM user</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          The user is added to <span className="font-medium">{orgName}</span> and receives an email
          invitation. They gain access after accepting the invite and signing in.
        </p>
        <InviteUserForm />
      </section>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Organization</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length > 0 ? (
              rows.map((row) => (
                <UserRow
                  key={row.id}
                  isSelf={row.id === user.id}
                  user={
                    {
                      id: row.id,
                      fullName: row.full_name ?? "",
                      email: row.email ?? "",
                      role: row.role,
                      status: row.status ?? "",
                      organizationName: orgName,
                      createdLabel: formatDate(row.created_at),
                      updatedLabel: formatDate(row.updated_at),
                    } satisfies UserRowData
                  }
                />
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No users found in this organization.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function getFlashMessage(notice?: string, error?: string) {
  if (error) {
    const message =
      {
        no_org: "No organization is configured for your account.",
        invalid_role: "The selected role is not valid.",
        invalid_status: "The selected status is not valid.",
        user_not_found: "That user was not found in your organization.",
        last_super_admin: "You cannot demote or disable the last active super admin.",
        self_disable_unconfirmed: "Disabling your own account needs explicit confirmation.",
        update_failed: "Failed to update the user.",
        disable_failed: "Failed to disable the user.",
        resend_failed: "Failed to resend the invitation.",
        resend_not_invited: "Only invited users can have their invitation resent.",
      }[error] ?? "The operation failed.";
    return { type: "error" as const, message };
  }

  if (notice) {
    const message =
      {
        user_updated: "User updated.",
        user_disabled: "User disabled.",
        invite_resent: "Invitation resent.",
      }[notice] ?? "Saved.";
    return { type: "success" as const, message };
  }

  return null;
}
