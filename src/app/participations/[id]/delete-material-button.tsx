"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteParticipationMaterial } from "./actions";

export function DeleteMaterialButton({
  participationId,
  materialId,
}: {
  participationId: string;
  materialId: string;
}) {
  return (
    <form
      action={deleteParticipationMaterial}
      onSubmit={(event) => {
        if (!window.confirm("Delete this material?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="participation_id" value={participationId} />
      <input type="hidden" name="material_id" value={materialId} />
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
      title="Delete material"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-60"
    >
      {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
    </button>
  );
}
