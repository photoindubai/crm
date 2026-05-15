"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/auth";
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

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,status")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: "No active CRM profile is linked to this login." };
  }

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
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}
