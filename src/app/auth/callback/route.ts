import { NextResponse, type NextRequest } from "next/server";
import { getSafeNextPath, resolveEntryProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const redirectUrl = request.nextUrl.clone();

  if (!code) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", next);
    redirectUrl.searchParams.set("error", "callback");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", next);
    redirectUrl.searchParams.set("error", "callback");
    return NextResponse.redirect(redirectUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", next);
    redirectUrl.searchParams.set("error", "callback");
    return NextResponse.redirect(redirectUrl);
  }

  // Entry point: accept active and invited (invited is upgraded to active here); reject the rest.
  const admin = createSupabaseAdminClient();
  const resolution = await resolveEntryProfile(admin, user.id);

  if (!resolution.ok) {
    await supabase.auth.signOut();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", next);
    redirectUrl.searchParams.set("error", "profile");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.pathname = next;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}
