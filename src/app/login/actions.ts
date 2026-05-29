"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeNextPath, resolveEntryProfile } from "@/lib/auth";
import { syncProfileFromAuth } from "@/lib/profile-sync.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
  message?: string;
};

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = getSafeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  // Entry point: accept active and invited (invited is upgraded to active here); reject the rest.
  const admin = createSupabaseAdminClient();
  const resolution = await resolveEntryProfile(admin, data.user.id);

  if (!resolution.ok) {
    await supabase.auth.signOut();
    return { error: "No active CRM profile is linked to this login." };
  }

  await syncProfileFromAuth(admin, data.user.id);

  redirect(next);
}

export async function sendMagicLink(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = getSafeNextPath(formData.get("next"));

  if (!email) {
    return { error: "Enter email." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await getAuthCallbackUrl(next),
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { error: "Could not send magic link for this email." };
  }

  return { message: "Magic link sent. Check your email." };
}

export async function signInWithGoogle(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: await getAuthCallbackUrl(next),
      scopes: "email profile",
    },
  });

  if (error || !data.url) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=oauth`);
  }

  redirect(data.url);
}

async function getAuthCallbackUrl(next: string) {
  // Always prefer the CRM's own URL so Supabase Auth returns here and never falls back to the
  // shared Auth Site URL (the exhibition website). The request origin is only a local-dev fallback.
  const headerStore = await headers();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? headerStore.get("origin") ?? "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", base);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}
