import { roleLabel } from "@/lib/roles";

export type ProfileBadgeProps = {
  fullName: string | null;
  email: string | null;
  role?: string | null;
};

function initials(name: string | null, email: string | null): string {
  const source = (name && name.trim()) || (email && email.trim()) || "";
  if (!source) {
    return "?";
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileBadge({ fullName, email, role }: ProfileBadgeProps) {
  const displayName = (fullName && fullName.trim()) || email || "Signed in";

  return (
    <div
      className="flex items-center gap-3 rounded-full border border-border bg-white py-1 pl-1 pr-3 shadow-soft"
      title={email ?? undefined}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {initials(fullName, email)}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {role ? roleLabel(role) : email}
        </span>
      </span>
    </div>
  );
}
