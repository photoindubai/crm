/* eslint-disable @next/next/no-img-element -- Small CRM table logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, Map, Plus, Settings } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

type Event = Database["public"]["Tables"]["events"]["Row"];
type ParticipationRow = Database["public"]["Views"]["participation_list_view"]["Row"];
type EventAction = Database["public"]["Views"]["event_action_list_view"]["Row"];
type Section = Database["public"]["Tables"]["event_sections"]["Row"];
type ProgramItem = Database["public"]["Tables"]["event_program_items"]["Row"];

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireActiveProfile();

  const { event, participations, actions, sections, program } = await loadCached(
    {
      keyParts: ["event-detail", profile.organization_id, id],
      tags: [cacheTags.events, cacheTags.event(id), cacheTags.participations, cacheTags.actions],
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      const [eventResult, participationsResult, actionsResult, sectionsResult, programResult] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).single(),
        supabase
          .from("participation_list_view")
          .select("*")
          .eq("event_id", id)
          .order("company_name", { ascending: true })
          .limit(8),
        supabase
          .from("event_action_list_view")
          .select("*")
          .eq("event_id", id)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(8),
        supabase.from("event_sections").select("*").eq("event_id", id).order("sort_order", { ascending: true }),
        supabase
          .from("event_program_items")
          .select("*")
          .eq("event_id", id)
          .order("starts_at", { ascending: true, nullsFirst: false })
          .limit(8),
      ]);

      if (eventResult.error) {
        if (eventResult.error.code === "PGRST116") {
          notFound();
        }

        throw new Error(eventResult.error.message);
      }

      const firstError = participationsResult.error ?? actionsResult.error ?? sectionsResult.error ?? programResult.error;

      if (firstError) {
        throw new Error(firstError.message);
      }

      return {
        event: eventResult.data as Event,
        participations: (participationsResult.data ?? []) as ParticipationRow[],
        actions: (actionsResult.data ?? []) as EventAction[],
        sections: (sectionsResult.data ?? []) as Section[],
        program: (programResult.data ?? []) as ProgramItem[],
      };
    },
  );

  const confirmedCount = participations.filter((participation) => participation.status === "confirmed").length;

  return (
    <AppShell title="Event Detail">
      <div className="space-y-6">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to events
        </Link>

        <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Events</div>
              <h2 className="truncate text-3xl font-bold text-primary">{event.event_name}</h2>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{[event.venue_name, event.city, event.country].filter(Boolean).join(", ") || "No venue"}</span>
                <span>{[event.start_date, event.end_date].filter(Boolean).join(" - ") || "No dates"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={event.status} />
              <button disabled className="h-9 cursor-not-allowed rounded-md border border-border px-3 text-sm opacity-50">
                Edit Event
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Panel
              title="Administrative Action Tracker"
              icon={<ClipboardList size={18} aria-hidden="true" />}
              action={
                <button disabled className="inline-flex cursor-not-allowed items-center gap-1 text-xs font-semibold text-primary opacity-50">
                  <Plus size={14} aria-hidden="true" />
                  New action
                </button>
              }
            >
              {actions.length > 0 ? (
                <div className="space-y-2">
                  {actions.map((action) => (
                    <div key={action.action_id} className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-primary">{action.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {action.due_date ? `Deadline: ${action.due_date}` : action.action_type ?? "No due date"}
                        </div>
                      </div>
                      <StatusBadge value={action.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText>No event actions yet.</EmptyText>
              )}
            </Panel>

            <Panel title={`Participating Exhibitors (${participations.length})`} icon={<CalendarDays size={18} aria-hidden="true" />}>
              {participations.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="bg-muted text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="w-[38%] px-3 py-2">Company</th>
                        <th className="w-[20%] px-3 py-2">Booth</th>
                        <th className="w-[18%] px-3 py-2">Type</th>
                        <th className="w-[14%] px-3 py-2">Status</th>
                        <th className="w-[10%] px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {participations.map((participation) => (
                        <tr key={participation.participation_id}>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {participation.logo_url ? (
                                <img src={participation.logo_url} alt="" loading="lazy" className="h-8 w-8 rounded-md border border-border object-contain" />
                              ) : (
                                <div className="h-8 w-8 rounded-md bg-muted" />
                              )}
                              <Link href={`/participations/${participation.participation_id}`} className="truncate font-medium text-primary hover:underline">
                                {participation.company_name}
                              </Link>
                            </div>
                          </td>
                          <td className="truncate px-3 py-3 text-muted-foreground">{participation.booth_numbers || "No booth"}</td>
                          <td className="truncate px-3 py-3 text-muted-foreground">{participation.participation_type ?? "Not set"}</td>
                          <td className="px-3 py-3">
                            <StatusBadge value={participation.status} />
                          </td>
                          <td className="px-3 py-3">
                            <Link href={`/participations/${participation.participation_id}`} className="text-xs font-semibold text-primary hover:underline">
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-border bg-muted/50 px-3 py-2 text-center text-xs">
                    <Link href={`/participations?event_id=${event.id}`} className="font-semibold text-primary hover:underline">
                      View all exhibitors
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyText>No participants yet.</EmptyText>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Exhibition Map" icon={<Map size={18} aria-hidden="true" />}>
              <div className="aspect-[4/3] rounded-lg border border-border bg-primary p-4 text-primary-foreground">
                <div className="h-full rounded-md border border-white/20 bg-[linear-gradient(to_right,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.12)_1px,transparent_1px)] bg-[size:28px_28px]" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <Metric label="Participants" value={participations.length} />
                <Metric label="Confirmed" value={confirmedCount} />
              </div>
            </Panel>

            <Panel title="Sections" icon={<Settings size={18} aria-hidden="true" />}>
              {sections.length > 0 ? (
                <div className="space-y-2">
                  {sections.map((section) => (
                    <div key={section.id} className="rounded-lg border border-border p-3">
                      <div className="font-medium text-primary">{section.name}</div>
                      <div className="text-xs text-muted-foreground">{section.slug ?? `Order ${section.sort_order ?? 0}`}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText>No sections configured.</EmptyText>
              )}
            </Panel>

            <Panel title="Conferences" icon={<CalendarDays size={18} aria-hidden="true" />}>
              {program.length > 0 ? (
                <div className="space-y-3">
                  {program.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">{item.starts_at ? formatDateTime(item.starts_at) : item.item_type ?? "Program"}</div>
                      <div className="mt-1 font-semibold text-primary">{item.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.venue ?? item.status ?? "No venue"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText>No program items yet.</EmptyText>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="rounded-lg border border-border bg-white p-4 shadow-soft">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-primary">{value}</div>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
