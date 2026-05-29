"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRecordOwner } from "@/lib/ownership-actions";
import { userDisplayName, type OrgUser, type OwnerEntity } from "@/lib/ownership";

export function OwnerCell({
  entity,
  recordId,
  ownerId,
  users,
  currentUserId,
}: {
  entity: OwnerEntity;
  recordId: string;
  ownerId: string | null;
  users: OrgUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(ownerId ?? "");

  function onChange(nextValue: string) {
    setValue(nextValue);
    const formData = new FormData();
    formData.set("entity", entity);
    formData.set("record_id", recordId);
    formData.set("owner_id", nextValue);
    startTransition(async () => {
      await setRecordOwner(formData);
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Owner"
      value={value}
      disabled={pending}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full max-w-[12rem] rounded-md border border-border bg-white px-2 text-xs outline-none focus:border-primary disabled:opacity-60"
    >
      <option value="">Unassigned</option>
      {users.map((user) => (
        <option key={user.id} value={user.id} disabled={user.disabled && user.id !== ownerId}>
          {userDisplayName(user.name, user.email)}
          {user.id === currentUserId ? " (me)" : ""}
          {user.disabled ? " - disabled" : ""}
        </option>
      ))}
    </select>
  );
}
