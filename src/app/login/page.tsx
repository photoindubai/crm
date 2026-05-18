import { getSafeNextPath } from "@/lib/auth";
import { getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import { LoginForm } from "./login-form";
import { Orbit } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const next = getSafeNextPath(getStringParam(params, "next"));
  const error = getStringParam(params, "error");

  return (
    <main className="min-h-screen bg-[#f3f5f8] px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-start justify-center bg-[#f5f7fa]">
        <div className="w-full max-w-md pt-4 sm:pt-8">
          <div className="mb-7 text-center">
            <div className="inline-flex items-center gap-2 text-primary">
              <Orbit size={28} strokeWidth={2.2} aria-hidden="true" />
              <span className="text-3xl font-semibold tracking-tight sm:text-4xl">ExhibitorPro</span>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-primary sm:text-4xl">Welcome back</h1>
            <p className="mt-2 text-base text-slate-600 sm:text-lg">Sign in to manage your exhibition logistics</p>
          </div>

          <section className="rounded-xl border border-slate-300 bg-[#f8fafc] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:p-6">
            {error ? <LoginError value={error} /> : null}
            <LoginForm next={next} />
          </section>
        </div>
      </section>
    </main>
  );
}

function LoginError({ value }: { value: string }) {
  const message =
    value === "profile"
      ? "This login is not linked to an active CRM profile."
      : value === "oauth"
        ? "Could not start Google sign in."
        : "Could not complete sign in. Try again.";

  return <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>;
}
