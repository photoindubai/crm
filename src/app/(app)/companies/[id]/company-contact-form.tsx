"use client";

import { useActionState, useEffect } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createCompanyContact, type CompanyContactFormState } from "./actions";

const initialState: CompanyContactFormState = {};

export function CompanyContactForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createCompanyContact, initialState);

  useEffect(() => {
    if (state.status !== "success" || !state.redirectTo) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push(state.redirectTo!);
      router.refresh();
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="company_id" value={companyId} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name" name="first_name" />
        <Field label="Last name" name="last_name" />
        <Field label="Email" name="email" type="email" />
        <Field label="Phone" name="phone" />
        <Field label="Position" name="position" />
        <Field label="Role" name="role" placeholder="Main contact, Sales, Logistics..." />
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-primary">
        <input type="checkbox" name="is_primary" className="h-4 w-4 rounded border-border" />
        Set as primary company contact
      </label>
      <FormMessage state={state} />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || state.status === "success"}
          className="inline-flex h-10 min-w-36 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-70"
        >
          {pending ? (
            <>
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : state.status === "success" ? (
            <>
              <Check size={16} aria-hidden="true" />
              Saved
            </>
          ) : (
            "Save contact"
          )}
        </button>
        {state.status === "success" ? <span className="text-sm text-emerald-700">Returning to company card...</span> : null}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-primary">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        className="h-11 rounded-md border border-border bg-white px-3 text-sm text-primary outline-none ring-0 transition focus:border-primary"
      />
    </label>
  );
}

function FormMessage({ state }: { state: CompanyContactFormState }) {
  if (state.status === "error" && state.message) {
    return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</div>;
  }

  if (state.status === "success" && state.message) {
    return <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</div>;
  }

  return null;
}
