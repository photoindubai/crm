"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { CRM_ROLES, roleLabel } from "@/lib/roles";
import { inviteUser, type InviteState } from "./actions";

const initialState: InviteState = {};

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-1">
        <label htmlFor="invite-full-name" className="text-sm font-semibold text-primary">
          Full name
        </label>
        <input
          id="invite-full-name"
          name="full_name"
          type="text"
          placeholder="Jane Doe"
          className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="sm:col-span-1">
        <label htmlFor="invite-email" className="text-sm font-semibold text-primary">
          Email
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="name@company.com"
          className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="sm:col-span-1">
        <label htmlFor="invite-role" className="text-sm font-semibold text-primary">
          Role
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="sales_manager"
          className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        >
          {CRM_ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end sm:col-span-1">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <UserPlus size={15} aria-hidden="true" />
          {pending ? "Sending invite..." : "Invite user"}
        </button>
      </div>
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {state.error}
        </div>
      ) : null}
      {state.message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2">
          {state.message}
        </div>
      ) : null}
    </form>
  );
}
