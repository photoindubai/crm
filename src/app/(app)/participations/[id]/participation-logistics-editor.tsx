"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveParticipationLogistics } from "./actions";

export type LogisticsItem = {
  key:
    | "badges_status"
    | "room_asset_status"
    | "check_in_status"
    | "furniture_status"
    | "electricity_status"
    | "internet_status"
    | "fascia_status"
    | "stand_design_status"
    | "conference_status";
  label: string;
  status: string | null;
};

export function ParticipationLogisticsEditor({
  participationId,
  items,
  notes,
}: {
  participationId: string;
  items: LogisticsItem[];
  notes?: string | null;
}) {
  const initialValues = useMemo(
    () => Object.fromEntries(items.map((item) => [item.key, isSubmitted(item.status)])) as Record<LogisticsItem["key"], boolean>,
    [items],
  );
  const [values, setValues] = useState(initialValues);

  const dirty = items.some((item) => values[item.key] !== initialValues[item.key]);

  return (
    <form action={saveParticipationLogistics} className="space-y-4">
      <input type="hidden" name="participation_id" value={participationId} />

      <div className="grid gap-x-8 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const enabled = values[item.key];

          return (
            <div key={item.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0 text-sm font-medium text-primary">{item.label}</div>
              <button
                type="button"
                onClick={() => setValues((current) => ({ ...current, [item.key]: !current[item.key] }))}
                aria-pressed={enabled}
                aria-label={`${item.label}: ${enabled ? "submitted" : "not submitted"}`}
                className="inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-300 transition-colors aria-pressed:bg-slate-500"
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <input type="hidden" name={item.key} value={resolveSubmittedStatus(item.status, enabled)} />
            </div>
          );
        })}
      </div>

      {notes ? (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <div className="mb-1 text-xs font-semibold uppercase text-primary">Notes</div>
          <p className="whitespace-pre-line">{notes}</p>
        </div>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <SaveButton dirty={dirty} />
        <button
          type="button"
          onClick={() => setValues(initialValues)}
          disabled={!dirty}
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SaveButton({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || !dirty;

  return (
    <button
      type="submit"
      disabled={disabled}
      className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition ${
        disabled ? "cursor-not-allowed bg-slate-300 text-slate-600" : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function isSubmitted(status: string | null) {
  return ["submitted", "approved", "completed", "rejected", "waiting_for_organizer"].includes(status ?? "");
}

function resolveSubmittedStatus(originalStatus: string | null, enabled: boolean) {
  if (!enabled) {
    return "";
  }

  return isSubmitted(originalStatus) ? originalStatus ?? "submitted" : "submitted";
}
