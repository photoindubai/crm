import Link from "next/link";
import { getCurrentProfileSummary, SUPER_ADMIN_ROLE } from "@/lib/auth";
import { ProfileBadge } from "@/components/profile-badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/companies", label: "Companies" },
  { href: "/contacts", label: "Contacts" },
  { href: "/events", label: "Events" },
  { href: "/participations", label: "Participations" },
  { href: "/brands", label: "Brands" },
  { href: "/smm", label: "SMM" },
  { href: "/tasks", label: "Actions" },
];

export async function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const summary = await getCurrentProfileSummary();
  const items =
    summary?.role === SUPER_ADMIN_ROLE
      ? [...navItems, { href: "/settings/users", label: "Settings" }]
      : navItems;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 md:grid-cols-[220px_1fr]">
        <aside className="border-b border-border bg-white px-4 py-4 md:border-b-0 md:border-r">
          <Link href="/" className="block text-lg font-semibold">
            Exhibition CRM
          </Link>
          <nav className="mt-6 flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action="/logout" method="post" className="mt-6">
            <button className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Sign out
            </button>
          </form>
        </aside>
        <section className="px-6 py-6">
          <header className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {summary ? (
              <ProfileBadge
                first_name={summary.firstName}
                last_name={summary.lastName}
                full_name={summary.fullName}
                email={summary.email}
                role={summary.role}
              />
            ) : null}
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
