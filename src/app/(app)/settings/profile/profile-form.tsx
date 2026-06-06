"use client";

import { useActionState } from "react";
import { roleLabel } from "@/lib/roles";
import { updateMyProfile, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = {};

export function ProfileForm({
  profile,
}: {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    position: string | null;
    role: string;
  };
}) {
  const [state, formAction, pending] = useActionState(updateMyProfile, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="first_name" className="text-sm font-semibold text-primary">
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            defaultValue={profile.first_name ?? ""}
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="text-sm font-semibold text-primary">
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            defaultValue={profile.last_name ?? ""}
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-semibold text-primary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={profile.email ?? ""}
          className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="position" className="text-sm font-semibold text-primary">
          Position
        </label>
        <input
          id="position"
          name="position"
          type="text"
          placeholder="Sales manager"
          defaultValue={profile.position ?? ""}
          className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-semibold text-primary">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ""}
          className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <span className="text-sm font-semibold text-primary">Role</span>
        <p className="mt-1 text-sm text-muted-foreground">{roleLabel(profile.role)}</p>
        <p className="mt-1 text-xs text-muted-foreground">Role can only be changed by a super admin.</p>
      </div>

      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      ) : null}
      {state.message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
