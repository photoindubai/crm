import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ClipboardList, Mail, Phone, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type CompanyContactRow = {
  role: string | null;
  is_primary: boolean | null;
  companies: {
    id: string;
    company_name: string;
    city: string | null;
    country: string | null;
    website: string | null;
  } | null;
};
type ParticipationContactRow = {
  role: string | null;
  is_primary: boolean | null;
  participations: {
    id: string;
    display_name: string | null;
    status: string | null;
    companies: { company_name: string } | null;
    events: { event_name: string } | null;
  } | null;
};
type ActionRow = Database["public"]["Views"]["contact_action_list_view"]["Row"];

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireActiveProfile();

  const { contact, companies, participations, actions } = await loadCached(
    {
      keyParts: ["contact-detail", profile.organization_id, id],
      tags: [cacheTags.contacts, cacheTags.contact(id), cacheTags.companies, cacheTags.participations, cacheTags.actions],
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      const [contactResult, companiesResult, participationsResult, actionsResult] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", id).single(),
        supabase
          .from("company_contacts")
          .select("role,is_primary,companies(id,company_name,city,country,website)")
          .eq("contact_id", id)
          .order("is_primary", { ascending: false }),
        supabase
          .from("participation_contacts")
          .select("role,is_primary,participations(id,display_name,status,companies(company_name),events(event_name))")
          .eq("contact_id", id)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_action_list_view")
          .select("*")
          .eq("contact_id", id)
          .order("due_date", { ascending: true, nullsFirst: false }),
      ]);

      if (contactResult.error) {
        if (contactResult.error.code === "PGRST116") {
          notFound();
        }

        throw new Error(contactResult.error.message);
      }

      const firstError = companiesResult.error ?? participationsResult.error ?? actionsResult.error;

      if (firstError) {
        throw new Error(firstError.message);
      }

      return {
        contact: contactResult.data as Contact,
        companies: (companiesResult.data ?? []) as unknown as CompanyContactRow[],
        participations: (participationsResult.data ?? []) as unknown as ParticipationContactRow[],
        actions: (actionsResult.data ?? []) as ActionRow[],
      };
    },
  );
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Unnamed contact";

  return (
    <AppShell title="Contact Detail">
      <div className="space-y-6">
        <Link href="/companies" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to companies
        </Link>

        <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-primary text-xl font-semibold text-primary-foreground">
              {getInitials(name) || <UserRound size={24} aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-3xl font-bold text-primary">{name}</h2>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{contact.position ?? "No position"}</span>
                <span className="inline-flex items-center gap-1">
                  <Mail size={14} aria-hidden="true" />
                  {contact.email ?? "No email"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone size={14} aria-hidden="true" />
                  {contact.phone ?? "No phone"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Companies" icon={<Building2 size={18} aria-hidden="true" />}>
            {companies.length > 0 ? (
              <div className="divide-y divide-border rounded-lg border border-border">
                {companies.map((row) => (
                  <div key={row.companies?.id ?? row.role ?? "company"} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      {row.companies?.id ? (
                        <Link href={`/companies/${row.companies.id}`} className="truncate font-medium text-primary hover:underline">
                          {row.companies.company_name}
                        </Link>
                      ) : (
                        <div className="truncate font-medium">Unknown company</div>
                      )}
                      <div className="truncate text-xs text-muted-foreground">
                        {[row.companies?.city, row.companies?.country].filter(Boolean).join(", ") || "No location"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{row.role ?? "No role"}</div>
                      {row.is_primary ? <div className="font-semibold text-primary">Primary</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>No company links.</EmptyText>
            )}
          </Panel>

          <Panel title="Participations" icon={<ClipboardList size={18} aria-hidden="true" />}>
            {participations.length > 0 ? (
              <div className="divide-y divide-border rounded-lg border border-border">
                {participations.map((row) => (
                  <div key={row.participations?.id ?? row.role ?? "participation"} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      {row.participations?.id ? (
                        <Link href={`/participations/${row.participations.id}`} className="truncate font-medium text-primary hover:underline">
                          {row.participations.display_name ?? row.participations.companies?.company_name ?? "Participant"}
                        </Link>
                      ) : (
                        <div className="truncate font-medium">Unknown participation</div>
                      )}
                      <div className="truncate text-xs text-muted-foreground">{row.participations?.events?.event_name ?? "No event"}</div>
                    </div>
                    <StatusBadge value={row.participations?.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>No participation links.</EmptyText>
            )}
          </Panel>
        </div>

        <Panel title="Actions" icon={<ClipboardList size={18} aria-hidden="true" />}>
          {actions.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-[36%] px-3 py-2">Action</th>
                    <th className="w-[18%] px-3 py-2">Status</th>
                    <th className="w-[18%] px-3 py-2">Type</th>
                    <th className="w-[18%] px-3 py-2">Due</th>
                    <th className="w-[10%] px-3 py-2">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {actions.map((action) => (
                    <tr key={action.action_id}>
                      <td className="truncate px-3 py-3 font-medium">{action.title}</td>
                      <td className="px-3 py-3">
                        <StatusBadge value={action.status} />
                      </td>
                      <td className="truncate px-3 py-3 text-muted-foreground">{action.action_type ?? action.channel ?? "No type"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{action.due_date ?? "No date"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{action.is_required ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyText>No actions.</EmptyText>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
        {icon}
        {title}
      </h3>
      <div className="rounded-lg border border-border bg-white p-4 shadow-soft">{children}</div>
    </section>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
