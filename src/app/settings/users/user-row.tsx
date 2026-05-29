"use client";

import { useState } from "react";
import { Pencil, RotateCw, Ban, X } from "lucide-react";
import { CRM_ROLES, PROFILE_STATUS, roleLabel, statusLabel } from "@/lib/roles";
import { disableUser, resendInvite, updateUser } from "./actions";

export type UserRowData = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  position: string;
  role: string;
  status: string;
  organizationName: string;
  createdLabel: string;
  updatedLabel: string;
};

const EDITABLE_STATUSES = [PROFILE_STATUS.active, PROFILE_STATUS.invited, PROFILE_STATUS.disabled];

function statusBadgeClass(status: string): string {
  switch (status) {
    case PROFILE_STATUS.active:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case PROFILE_STATUS.invited:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case PROFILE_STATUS.disabled:
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function UserRow({ user, isSelf }: { user: UserRowData; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const isDisabled = user.status === PROFILE_STATUS.disabled;
  const isInvited = user.status === PROFILE_STATUS.invited;

  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-4 font-medium">
          {user.displayName !== "No name" ? user.displayName : <span className="text-muted-foreground">No name</span>}
          {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
        </td>
        <td className="truncate px-4 py-4 text-muted-foreground">{user.email || "—"}</td>
        <td className="px-4 py-4 text-muted-foreground">{roleLabel(user.role)}</td>
        <td className="px-4 py-4">
          <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusBadgeClass(user.status)}`}>
            {statusLabel(user.status)}
          </span>
        </td>
        <td className="px-4 py-4 text-muted-foreground">{user.organizationName}</td>
        <td className="px-4 py-4 text-muted-foreground">{user.createdLabel}</td>
        <td className="px-4 py-4 text-muted-foreground">{user.updatedLabel}</td>
        <td className="px-4 py-4">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              title={editing ? "Cancel edit" : "Edit user"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
            >
              {editing ? <X size={15} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
              <span className="sr-only">{editing ? "Cancel edit" : "Edit user"}</span>
            </button>

            {isInvited ? (
              <form action={resendInvite}>
                <input type="hidden" name="user_id" value={user.id} />
                <button
                  type="submit"
                  title="Resend invite"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  <RotateCw size={15} aria-hidden="true" />
                  <span className="sr-only">Resend invite</span>
                </button>
              </form>
            ) : null}

            {!isDisabled ? (
              <form
                action={disableUser}
                onSubmit={(event) => {
                  const text = isSelf
                    ? "Disable YOUR OWN account? You will lose CRM access immediately."
                    : "Disable this user? They will lose CRM access.";
                  if (!window.confirm(text)) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="user_id" value={user.id} />
                <input type="hidden" name="confirm" value="1" />
                <button
                  type="submit"
                  title="Disable user"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600"
                >
                  <Ban size={15} aria-hidden="true" />
                  <span className="sr-only">Disable user</span>
                </button>
              </form>
            ) : null}
          </div>
        </td>
      </tr>

      {editing ? (
        <tr className="bg-muted/40">
          <td colSpan={8} className="px-4 py-4">
            <form
              action={updateUser}
              onSubmit={(event) => {
                const statusValue = (event.currentTarget.elements.namedItem("status") as HTMLSelectElement | null)?.value;
                if (isSelf && statusValue === PROFILE_STATUS.disabled) {
                  if (!window.confirm("Disable YOUR OWN account? You will lose CRM access immediately.")) {
                    event.preventDefault();
                  }
                }
              }}
              className="grid gap-3 sm:grid-cols-4"
            >
              <input type="hidden" name="user_id" value={user.id} />
              {isSelf ? <input type="hidden" name="confirm" value="1" /> : null}
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">First name</label>
                <input
                  name="first_name"
                  type="text"
                  defaultValue={user.firstName}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last name</label>
                <input
                  name="last_name"
                  type="text"
                  defaultValue={user.lastName}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={user.phone}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Position</label>
                <input
                  name="position"
                  type="text"
                  defaultValue={user.position}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</label>
                <select
                  name="role"
                  defaultValue={CRM_ROLES.includes(user.role as (typeof CRM_ROLES)[number]) ? user.role : "sales_manager"}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                >
                  {CRM_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
                <select
                  name="status"
                  defaultValue={user.status}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                >
                  {EDITABLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-4">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  Save changes
                </button>
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
