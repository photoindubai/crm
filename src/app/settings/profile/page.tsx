import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireActiveProfile } from "@/lib/auth";
import { profileDisplayName } from "@/lib/profile-display";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const { profile } = await requireActiveProfile();

  return (
    <AppShell title="My profile">
      <div className="space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to dashboard
        </Link>

        <div className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-primary">{profileDisplayName(profile)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your contact details. Your role is managed by a super admin.
          </p>
          <div className="mt-6">
            <ProfileForm profile={profile} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
