"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteParticipationContact } from "./actions";

export function DeleteParticipationContactButton({
  participationId,
  contactLinkId,
  contactId,
}: {
  participationId: string;
  contactLinkId: string;
  contactId: string;
}) {
  return (
    <form
      action={deleteParticipationContact}
      onSubmit={(event) => {
        if (!window.confirm("Remove this contact from the participant?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="participation_id" value={participationId} />
      <input type="hidden" name="contact_link_id" value={contactLinkId} />
      <input type="hidden" name="contact_id" value={contactId} />
      <DeleteSubmit />
    </form>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title="Remove contact from participant"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-60"
    >
      {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
    </button>
  );
}
