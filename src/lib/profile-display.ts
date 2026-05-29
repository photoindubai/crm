/**
 * Client-safe profile display helpers.
 */

export type ProfileNameFields = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
};

export function profileDisplayName(profile: ProfileNameFields): string {
  const fromParts = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  if (fromParts) {
    return fromParts;
  }
  const legacy = profile.full_name?.trim();
  if (legacy) {
    return legacy;
  }
  return profile.email?.trim() || "No name";
}

export function profileInitials(profile: ProfileNameFields): string {
  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();
  if (first && last) {
    return (first[0] + last[0]).toUpperCase();
  }
  const display = profileDisplayName(profile);
  if (display === "No name") {
    return "?";
  }
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return display.slice(0, 2).toUpperCase();
}

/** Parse auth user_metadata / raw_user_meta_data into CRM name fields. */
export function parseAuthNameFields(meta: Record<string, unknown> | null | undefined): {
  first_name: string | null;
  last_name: string | null;
} {
  const m = meta ?? {};
  const given =
    stringOrNull(m.given_name) ??
    stringOrNull(m.first_name) ??
    splitFirst(stringOrNull(m.name) ?? stringOrNull(m.full_name));
  const family =
    stringOrNull(m.family_name) ??
    stringOrNull(m.last_name) ??
    splitRest(stringOrNull(m.name) ?? stringOrNull(m.full_name));

  return { first_name: given, last_name: family };
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function splitFirst(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const parts = value.split(/\s+/).filter(Boolean);
  return parts[0] ?? null;
}

function splitRest(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return parts.slice(1).join(" ");
}
