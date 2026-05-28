/**
 * Client-safe role/status constants and labels.
 *
 * This module must not import any server-only code so it can be used from both server and client
 * components. Auth gates and helpers live in `@/lib/auth`.
 */

export const PROFILE_STATUS = {
  active: "active",
  invited: "invited",
  disabled: "disabled",
} as const;

export type ProfileStatus = (typeof PROFILE_STATUS)[keyof typeof PROFILE_STATUS];

export const SUPER_ADMIN_ROLE = "super_admin" as const;

/** Roles selectable in the user-management UI. */
export const CRM_ROLES = [
  "super_admin",
  "event_manager",
  "smm_manager",
  "sales_manager",
] as const;

export type ProfileRole = (typeof CRM_ROLES)[number];

/** Legacy roles that exist in the DB constraint but are not offered in the UI. */
export const LEGACY_ROLES = ["sales", "marketing", "ops"] as const;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  event_manager: "Event Manager",
  smm_manager: "SMM Manager",
  sales_manager: "Sales Manager",
  sales: "Sales (legacy)",
  marketing: "Marketing (legacy)",
  ops: "Ops (legacy)",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  invited: "Invited",
  disabled: "Disabled",
};

export function isAssignableRole(value: unknown): value is ProfileRole {
  return typeof value === "string" && (CRM_ROLES as readonly string[]).includes(value);
}

export function isKnownRole(value: unknown): boolean {
  return (
    typeof value === "string" &&
    ((CRM_ROLES as readonly string[]).includes(value) ||
      (LEGACY_ROLES as readonly string[]).includes(value))
  );
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) {
    return "—";
  }
  return ROLE_LABELS[role] ?? role;
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) {
    return "Unknown";
  }
  return STATUS_LABELS[status] ?? status;
}
