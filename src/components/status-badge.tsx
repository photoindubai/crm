export function StatusBadge({ value }: { value: string | null | undefined }) {
  return <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{value || "not_started"}</span>;
}

