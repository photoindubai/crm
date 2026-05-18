"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteEventSection } from "./actions";

export function DeleteSectionButton({ eventId, sectionId }: { eventId: string; sectionId: string }) {
  return (
    <form
      action={deleteEventSection}
      onSubmit={(event) => {
        if (!window.confirm("Delete this section?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="section_id" value={sectionId} />
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-60"
      title="Delete section"
    >
      {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
    </button>
  );
}
