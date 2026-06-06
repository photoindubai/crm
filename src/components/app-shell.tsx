import Link from "next/link";
import { getCurrentProfileSummary, SUPER_ADMIN_ROLE } from "@/lib/auth";
import { AppNav, type NavItem } from "@/components/app-nav";
import { LogoutForm } from "@/components/logout-form";
import { ProfileBadge } from "@/components/profile-badge";

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/companies", label: "Companies" },
  { href: "/contacts", label: "Contacts" },
  {
    href: "/events",
    label: "Events",
    children: [
      { href: "/participations", label: "Participations" },
      { href: "/brands", label: "Brands" },
      { href: "/smm", label: "SMM" },
    ],
  },
  { href: "/tasks", label: "Actions" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const summary = await getCurrentProfileSummary();
  const items: NavItem[] =
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
          {summary ? (
            <div className="mt-4 max-w-full overflow-hidden">
              <ProfileBadge
                first_name={summary.firstName}
                last_name={summary.lastName}
                full_name={summary.fullName}
                email={summary.email}
                role={summary.role}
              />
            </div>
          ) : null}
          <AppNav items={items} />
          <LogoutForm />
        </aside>
        <section className="px-6 py-6">{children}</section>
      </div>
    </main>
  );
}
