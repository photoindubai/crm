"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSectionParticipations } from "./actions";

export type SectionMemberParticipant = {
  participationId: string;
  companyName: string;
  boothNumbers: string | null;
};

export function SectionMembersModal({
  eventId,
  sectionId,
  sectionName,
  participants,
  initialAssignedIds,
}: {
  eventId: string;
  sectionId: string;
  sectionName: string;
  participants: SectionMemberParticipant[];
  initialAssignedIds: string[];
}) {
  const router = useRouter();
  const [assignedIds, setAssignedIds] = useState(() => new Set(initialAssignedIds));
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    const initial = new Set(initialAssignedIds);
    if (initial.size !== assignedIds.size) {
      return true;
    }

    for (const id of assignedIds) {
      if (!initial.has(id)) {
        return true;
      }
    }

    return false;
  }, [assignedIds, initialAssignedIds]);

  const filteredParticipants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return participants;
    }

    return participants.filter((participant) => participant.companyName.toLowerCase().includes(normalizedQuery));
  }, [participants, query]);

  function toggleAssignment(participationId: string) {
    setAssignedIds((current) => {
      const next = new Set(current);
      if (next.has(participationId)) {
        next.delete(participationId);
      } else {
        next.add(participationId);
      }

      return next;
    });
  }

  function closeWithoutSaving() {
    router.push(`/events/${eventId}`);
  }

  function handleClose() {
    if (dirty) {
      saveAndClose();
      return;
    }

    closeWithoutSaving();
  }

  function saveAndClose() {
    startTransition(async () => {
      setErrorMessage(null);

      const result = await saveSectionParticipations({
        eventId,
        sectionId,
        assignedParticipationIds: [...assignedIds],
      });

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      router.push(`/events/${eventId}?notice=section_participations_saved`);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-primary">{sectionName}</h4>
            <p className="text-xs text-muted-foreground">Assign participants by name search. Changes are saved together.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            {isPending ? "Saving..." : dirty ? "Save & close" : "Close"}
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search participants..."
            className="h-10 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
          />
        </div>

        {errorMessage ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
          {filteredParticipants.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredParticipants.map((participation) => {
                const assigned = assignedIds.has(participation.participationId);

                return (
                  <div key={participation.participationId} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-primary">{participation.companyName}</div>
                      <div className="truncate text-xs text-muted-foreground">{participation.boothNumbers || "No booth"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAssignment(participation.participationId)}
                      disabled={isPending}
                      className={
                        assigned
                          ? "h-8 rounded-md border border-border px-3 text-xs font-semibold text-primary hover:bg-muted disabled:opacity-50"
                          : "h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      }
                    >
                      {assigned ? "Remove" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">No matching participants.</div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : "No changes"}
            {" · "}
            {assignedIds.size} in section
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (dirty && !window.confirm("Discard unsaved section membership changes?")) {
                  return;
                }

                closeWithoutSaving();
              }}
              disabled={isPending}
              className="h-9 rounded-md border border-border px-3 text-sm font-medium text-primary hover:bg-muted disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={saveAndClose}
              disabled={isPending || !dirty}
              className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
