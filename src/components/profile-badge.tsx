import Link from "next/link";
import { roleLabel } from "@/lib/roles";
import { profileDisplayName, profileInitials, type ProfileNameFields } from "@/lib/profile-display";

export type ProfileBadgeProps = ProfileNameFields & {
  role?: string | null;
  href?: string;
};

export function ProfileBadge({ first_name, last_name, full_name, email, role, href = "/settings/profile" }: ProfileBadgeProps) {
  const displayName = profileDisplayName({ first_name, last_name, full_name, email });

  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {profileInitials({ first_name, last_name, full_name, email })}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
        <span className="truncate text-xs text-muted-foreground">{role ? roleLabel(role) : email}</span>
      </span>
    </>
  );

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-full border border-border bg-white py-1 pl-1 pr-3 shadow-soft transition hover:border-primary"
      title={`${displayName}${email ? ` · ${email}` : ""}`}
    >
      {content}
    </Link>
  );
}
