"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export type NavChildItem = {
  href: string;
  label: string;
};

export type NavItem = {
  href: string;
  label: string;
  children?: NavChildItem[];
};

const EVENTS_PREFIXES = ["/events", "/participations", "/brands", "/smm"];

function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isEventsSection(pathname: string): boolean {
  return EVENTS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function linkClassName(isActive: boolean): string {
  const base =
    "rounded-md px-3 py-2 text-sm font-medium hover:bg-muted hover:text-foreground";
  return isActive
    ? `${base} bg-muted text-foreground`
    : `${base} text-muted-foreground`;
}

function childLinkClassName(isActive: boolean): string {
  const base =
    "rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted hover:text-foreground";
  return isActive
    ? `${base} bg-muted text-foreground`
    : `${base} text-muted-foreground`;
}

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    for (const item of items) {
      if (!item.children?.length) {
        continue;
      }

      setExpandedGroups((prev) => ({
        ...prev,
        [item.href]: isEventsSection(pathname),
      }));
    }
  }, [pathname, items]);

  function toggleGroup(href: string) {
    setExpandedGroups((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <nav className="mt-6 flex flex-col gap-1">
      {items.map((item) => {
        if (item.children?.length) {
          const isExpanded = expandedGroups[item.href] ?? false;
          const parentActive =
            isPathActive(pathname, item.href) ||
            item.children.some((child) => isPathActive(pathname, child.href));

          return (
            <div key={item.href}>
              <div className="flex items-center gap-0.5">
                <Link
                  href={item.href}
                  className={`flex-1 ${linkClassName(parentActive)}`}
                >
                  {item.label}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.href)}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "Collapse submenu" : "Expand submenu"}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isExpanded ? (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={childLinkClassName(
                        isPathActive(pathname, child.href),
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={linkClassName(isPathActive(pathname, item.href))}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
