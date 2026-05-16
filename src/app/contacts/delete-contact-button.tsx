"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteContact } from "./actions";

export function DeleteContactButton({
  contactId,
  returnTo,
  compact = false,
}: {
  contactId: string;
  returnTo: string;
  compact?: boolean;
}) {
  return (
    <form
      action={deleteContact}
      onSubmit={(event) => {
        if (!window.confirm("Delete this contact from CRM? This will remove its company and participation links.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="contact_id" value={contactId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <DeleteSubmit compact={compact} />
    </form>
  );
}

function DeleteSubmit({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title="Delete contact"
      className={
        compact
          ? "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-60"
          : "inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      }
    >
      {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
      {compact ? <span className="sr-only">Delete contact</span> : pending ? "Deleting..." : "Delete"}
    </button>
  );
}
