/**
 * Client-safe ownership types and helpers.
 *
 * Must not import server-only code: this is used by both server pages and the client OwnerCell.
 * The mapping of entity -> table/column and all DB access live in `ownership.server.ts` /
 * `ownership-actions.ts`.
 */

export type OwnerEntity = "company" | "contact" | "brand" | "participation" | "action";

export const OWNER_ENTITIES: OwnerEntity[] = [
  "company",
  "contact",
  "brand",
  "participation",
  "action",
];

export const OWNER_ENTITY_LABELS: Record<OwnerEntity, string> = {
  company: "Company",
  contact: "Contact",
  brand: "Brand",
  participation: "Participation",
  action: "Action",
};

export function isOwnerEntity(value: unknown): value is OwnerEntity {
  return typeof value === "string" && (OWNER_ENTITIES as string[]).includes(value);
}

export type OrgUser = {
  id: string;
  name: string;
  email: string | null;
  disabled: boolean;
};

export function userDisplayName(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  return (name && name.trim()) || email || "Unknown user";
}
