import { getSafeNextPath } from "@/lib/auth";
import { getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const next = getSafeNextPath(getStringParam(params, "next"));
  const error = getStringParam(params, "error");

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-soft">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase text-muted-foreground">Exhibition CRM</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        </div>
        {error ? <LoginError value={error} /> : null}
        <LoginForm next={next} />
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
