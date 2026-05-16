"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteParticipationBrand } from "./actions";

export function DeleteParticipationBrandButton({
  participationId,
  brandLinkId,
  brandId,
}: {
  participationId: string;
  brandLinkId: string;
  brandId: string;
}) {
  return (
    <form
      action={deleteParticipationBrand}
      onSubmit={(event) => {
        if (!window.confirm("Remove this brand from the participant?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="participation_id" value={participationId} />
      <input type="hidden" name="brand_link_id" value={brandLinkId} />
      <input type="hidden" name="brand_id" value={brandId} />
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
      title="Remove brand from participant"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-60"
    >
      {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
    </button>
  );
}
