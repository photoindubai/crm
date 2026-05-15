/* eslint-disable @next/next/no-img-element -- CRM logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

type Company = Database["public"]["Tables"]["companies"]["Row"];

type ContactRow = {
  role: string | null;
  is_primary: boolean | null;
  contacts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    position: string | null;
  } | null;
};

type ParticipationRow = Pick<
  Database["public"]["Tables"]["participations"]["Row"],
  | "id"
  | "event_id"
  | "status"
  | "booking_status"
  | "payment_status"
  | "profile_status"
  | "materials_status"
  | "logistics_status"
  | "smm_status"
  | "package_name"
  | "participation_type"
  | "internal_notes"
> & {
  events: {
    event_name: string;
    start_date: string | null;
    end_date: string | null;
    venue_name: string | null;
  } | null;
};

type BoothAssignmentRow = {
  participation_id: string | null;
  booths: {
    booth_number: string;
    hall: string | null;
    zone: string | null;
    area_sqm: number | null;
    status: string | null;
  } | null;
};

type BrandRow = {
  participation_id?: string | null;
  brands: {
    id: string;
    brand_name: string;
    website: string | null;
    brand_logo_url: string | null;
    country: string | null;
  } | null;
};

type MaterialRow = Pick<
  Database["public"]["Tables"]["exhibitor_materials"]["Row"],
  "id" | "participation_id" | "material_type" | "title" | "url" | "status" | "updated_at"
>;

type SmmTaskRow = Pick<
  Database["public"]["Tables"]["smm_tasks"]["Row"],
  "id" | "participation_id" | "title" | "status" | "due_date" | "publication_url" | "platform" | "task_type"
>;

type TaskRow = Pick<
  Database["public"]["Tables"]["tasks"]["Row"],
  "id" | "title" | "status" | "priority" | "due_date" | "task_category" | "participation_id" | "company_id"
>;

type LogisticsRow = Pick<
  Database["public"]["Tables"]["participation_logistics"]["Row"],
  | "participation_id"
  | "badges_status"
  | "check_in_status"
  | "conference_status"
  | "electricity_status"
  | "fascia_status"
  | "furniture_status"
  | "internet_status"
  | "room_asset_status"
  | "stand_design_status"
>;

type NoteRow = Pick<
  Database["public"]["Tables"]["notes"]["Row"],
  "id" | "body" | "note_type" | "created_at" | "participation_id"
>;

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const [companyResult, contactsResult, participationsResult, notesResult, companyBrandsResult, companyTasksResult] =
    await Promise.all([
      supabase.from("companies").select("*").eq("id", id).single(),
      supabase
        .from("company_contacts")
        .select("role,is_primary,contacts(id,first_name,last_name,email,phone,position)")
        .eq("company_id", id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("participations")
        .select(
          "id,event_id,status,booking_status,payment_status,profile_status,materials_status,logistics_status,smm_status,package_name,participation_type,internal_notes,events(event_name,start_date,end_date,venue_name)",
        )
        .eq("company_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("notes")
        .select("id,body,note_type,created_at,participation_id")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("company_brands")
        .select("brands(id,brand_name,website,brand_logo_url,country)")
        .eq("company_id", id),
      supabase
        .from("tasks")
        .select("id,title,status,priority,due_date,task_category,participation_id,company_id")
        .eq("company_id", id)
        .order("due_date", { ascending: true, nullsFirst: false }),
    ]);

  if (companyResult.error) {
    if (companyResult.error.code === "PGRST116") {
      notFound();
    }

    throw new Error(companyResult.error.message);
  }

  const firstError =
    contactsResult.error ??
    participationsResult.error ??
    notesResult.error ??
    companyBrandsResult.error ??
    companyTasksResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const company = companyResult.data as Company;
  const contacts = (contactsResult.data ?? []) as unknown as ContactRow[];
  const participations = (participationsResult.data ?? []) as unknown as ParticipationRow[];
  const participationIds = participations.map((participation) => participation.id);

  const [boothsResult, participationBrandsResult, materialsResult, smmTasksResult, logisticsResult, participationTasksResult] =
    participationIds.length > 0
      ? await Promise.all([
          supabase
            .from("booth_assignments")
            .select("participation_id,booths(booth_number,hall,zone,area_sqm,status)")
            .in("participation_id", participationIds),
          supabase
            .from("participation_brands")
            .select("participation_id,brands(id,brand_name,website,brand_logo_url,country)")
            .in("participation_id", participationIds),
          supabase
            .from("exhibitor_materials")
            .select("id,participation_id,material_type,title,url,status,updated_at")
            .in("participation_id", participationIds)
            .order("material_type", { ascending: true }),
          supabase
            .from("smm_tasks")
            .select("id,participation_id,title,status,due_date,publication_url,platform,task_type")
            .in("participation_id", participationIds)
            .order("due_date", { ascending: true, nullsFirst: false }),
          supabase
            .from("participation_logistics")
            .select(
              "participation_id,badges_status,check_in_status,conference_status,electricity_status,fascia_status,furniture_status,internet_status,room_asset_status,stand_design_status",
            )
            .in("participation_id", participationIds),
          supabase
            .from("tasks")
            .select("id,title,status,priority,due_date,task_category,participation_id,company_id")
            .in("participation_id", participationIds)
            .order("due_date", { ascending: true, nullsFirst: false }),
        ])
      : [emptyResult(), emptyResult(), emptyResult(), emptyResult(), emptyResult(), emptyResult()];

  const relationError =
    boothsResult.error ??
    participationBrandsResult.error ??
    materialsResult.error ??
    smmTasksResult.error ??
    logisticsResult.error ??
    participationTasksResult.error;

  if (relationError) {
    throw new Error(relationError.message);
  }

  const boothsByParticipation = groupBy((boothsResult.data ?? []) as unknown as BoothAssignmentRow[], (row) => row.participation_id);
  const brandsByParticipation = groupBy(
    (participationBrandsResult.data ?? []) as unknown as BrandRow[],
    (row) => row.participation_id,
  );
  const materialsByParticipation = groupBy((materialsResult.data ?? []) as MaterialRow[], (row) => row.participation_id);
  const smmTasksByParticipation = groupBy((smmTasksResult.data ?? []) as SmmTaskRow[], (row) => row.participation_id);
  const logisticsByParticipation = new Map(
    ((logisticsResult.data ?? []) as LogisticsRow[]).map((row) => [row.participation_id, row]),
  );
  const allTasks = dedupeTasks([
    ...((companyTasksResult.data ?? []) as TaskRow[]),
    ...((participationTasksResult.data ?? []) as TaskRow[]),
  ]);
  const companyBrands = (companyBrandsResult.data ?? []) as unknown as BrandRow[];
  const notes = (notesResult.data ?? []) as NoteRow[];

  return (
    <AppShell title={company.company_name}>
      <div className="mb-4">
        <Link href="/companies" className="text-sm text-primary hover:underline">
          Back to companies
        </Link>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft">
          <div className="flex gap-4">
            {company.company_logo_url ? (
              <img
                src={company.company_logo_url}
                alt=""
                loading="lazy"
                className="h-16 w-16 rounded-md border border-border object-contain"
              />
            ) : (
              <div className="h-16 w-16 rounded-md border border-border bg-muted" />
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">{company.company_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{[company.city, company.country].filter(Boolean).join(", ") || "No location"}</p>
              {company.website ? (
                <a href={company.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{company.description || "No description."}</p>
        </div>

        <Section title="Contacts">
          {contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((item) => (
                <div key={item.contacts?.id ?? item.role} className="text-sm">
                  <div className="font-medium">
                    {formatContactName(item.contacts)}
                    {item.is_primary ? <span className="ml-2 text-xs text-primary">primary</span> : null}
                  </div>
                  <div className="text-muted-foreground">{item.contacts?.position ?? item.role ?? "No role"}</div>
                  <div className="text-muted-foreground">{item.contacts?.email ?? "No email"}</div>
                  <div className="text-muted-foreground">{item.contacts?.phone ?? "No phone"}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No contacts.</EmptyText>
          )}
        </Section>
      </section>

      <div className="grid gap-6">
        <Section title="Participations">
          {participations.length > 0 ? (
            <div className="space-y-5">
              {participations.map((participation) => (
                <ParticipationCard
                  key={participation.id}
                  participation={participation}
                  booths={boothsByParticipation.get(participation.id) ?? []}
                  brands={brandsByParticipation.get(participation.id) ?? []}
                  materials={materialsByParticipation.get(participation.id) ?? []}
                  smmTasks={smmTasksByParticipation.get(participation.id) ?? []}
                  logistics={logisticsByParticipation.get(participation.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyText>No participations.</EmptyText>
          )}
        </Section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Section title="Company brands">
            {companyBrands.length > 0 ? (
              <SimpleList>
                {companyBrands.map((item) => (
                  <li key={item.brands?.id ?? item.brands?.brand_name}>
                    <ExternalLink href={item.brands?.website}>{item.brands?.brand_name ?? "Unnamed brand"}</ExternalLink>
                    <span className="text-muted-foreground">{item.brands?.country ?? ""}</span>
                  </li>
                ))}
              </SimpleList>
            ) : (
              <EmptyText>No brands.</EmptyText>
            )}
          </Section>

          <Section title="Tasks">
            {allTasks.length > 0 ? (
              <SimpleList>
                {allTasks.map((task) => (
                  <li key={task.id}>
                    <span>{task.title}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge value={task.status} />
                      <span className="text-muted-foreground">{task.due_date ?? "No date"}</span>
                    </span>
                  </li>
                ))}
              </SimpleList>
            ) : (
              <EmptyText>No tasks.</EmptyText>
            )}
          </Section>
        </section>

        <Section title="Notes">
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{note.note_type ?? "note"}</span>
                    <span>{note.created_at ?? ""}</span>
                  </div>
                  <p className="whitespace-pre-line">{note.body ?? ""}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No notes.</EmptyText>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function ParticipationCard({
  participation,
  booths,
  brands,
  materials,
  smmTasks,
  logistics,
}: {
  participation: ParticipationRow;
  booths: BoothAssignmentRow[];
  brands: BrandRow[];
  materials: MaterialRow[];
  smmTasks: SmmTaskRow[];
  logistics: LogisticsRow | undefined;
}) {
  const logisticsValues = logistics
    ? [
        logistics.badges_status,
        logistics.check_in_status,
        logistics.conference_status,
        logistics.electricity_status,
        logistics.fascia_status,
        logistics.furniture_status,
        logistics.internet_status,
        logistics.room_asset_status,
        logistics.stand_design_status,
      ]
    : [];
  const completedLogistics = logisticsValues.filter((value) => value === "completed").length;

  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{participation.events?.event_name ?? "No event"}</h3>
          <p className="text-sm text-muted-foreground">
            {[participation.events?.venue_name, participation.events?.start_date].filter(Boolean).join(" / ") || "No event dates"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={participation.status} />
          <StatusBadge value={participation.payment_status} />
          <StatusBadge value={participation.smm_status} />
        </div>
      </div>

      <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label="Booths" value={booths.map((item) => item.booths?.booth_number).filter(Boolean).join(", ") || "No booths"} />
        <InfoBlock label="Package" value={participation.package_name ?? "No package"} />
        <InfoBlock label="Type" value={participation.participation_type ?? "Not set"} />
        <InfoBlock
          label="Logistics"
          value={logisticsValues.length > 0 ? `${completedLogistics}/${logisticsValues.length} complete` : "No logistics"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <MiniList title="Brands" empty="No brands">
          {brands.map((item) => (
            <li key={item.brands?.id ?? item.brands?.brand_name}>
              <ExternalLink href={item.brands?.website}>{item.brands?.brand_name ?? "Unnamed brand"}</ExternalLink>
            </li>
          ))}
        </MiniList>
        <MiniList title="Materials" empty="No materials">
          {materials.map((material) => (
            <li key={material.id}>
              <ExternalLink href={material.url}>{material.title ?? material.material_type ?? "Material"}</ExternalLink>
              <StatusBadge value={material.status} />
            </li>
          ))}
        </MiniList>
        <MiniList title="SMM tasks" empty="No SMM tasks">
          {smmTasks.map((task) => (
            <li key={task.id}>
              <ExternalLink href={task.publication_url}>{task.title ?? task.task_type ?? "SMM task"}</ExternalLink>
              <span className="text-muted-foreground">{task.due_date ?? ""}</span>
            </li>
          ))}
        </MiniList>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function SimpleList({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 text-sm [&>li]:flex [&>li]:justify-between [&>li]:gap-3">{children}</ul>;
}

function MiniList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h4>
      {children.length > 0 ? <ul className="space-y-2 text-sm">{children}</ul> : <EmptyText>{empty}</EmptyText>}
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function ExternalLink({ href, children }: { href: string | null | undefined; children: React.ReactNode }) {
  if (!href) {
    return <span>{children}</span>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
      {children}
    </a>
  );
}

function formatContactName(contact: ContactRow["contacts"]) {
  if (!contact) {
    return "Unnamed contact";
  }

  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Unnamed contact";
}

function groupBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = getKey(row);

    if (!key) {
      continue;
    }

    map.set(key, [...(map.get(key) ?? []), row]);
  }

  return map;
}

function dedupeTasks(tasks: TaskRow[]) {
  const seen = new Set<string>();
  const result: TaskRow[] = [];

  for (const task of tasks) {
    if (seen.has(task.id)) {
      continue;
    }

    seen.add(task.id);
    result.push(task);
  }

  return result;
}

function emptyResult<T>() {
  return { data: [] as T[], error: null };
}
