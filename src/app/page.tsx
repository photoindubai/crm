import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, Megaphone, ClipboardList } from "lucide-react";
import { requireActiveProfile } from "@/lib/auth";

const modules = [
  {
    title: "Companies",
    description: "Persistent company records, contacts, brands, and event history.",
    href: "/companies",
    icon: Building2,
  },
  {
    title: "Participations",
    description: "Event-specific exhibitor records with booths, logistics, and materials.",
    href: "/participations",
    icon: CalendarDays,
  },
  {
    title: "SMM Workspace",
    description: "Content workflow for missing materials, approvals, and publications.",
    href: "/smm",
    icon: Megaphone,
  },
  {
    title: "Tasks",
    description: "Operational task board for sales, logistics, SMM, and internal follow-ups.",
    href: "/tasks",
    icon: ClipboardList,
  },
];

export default async function Home() {
  await requireActiveProfile();

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              High End & Smart Home Show
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
              Exhibition CRM
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft"
          >
            Open dashboard
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.href}
                href={module.href}
                className="rounded-lg border border-border bg-white p-5 shadow-soft transition hover:border-slate-300"
              >
                <Icon className="mb-4 text-primary" size={22} aria-hidden="true" />
                <h2 className="text-base font-semibold">{module.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
