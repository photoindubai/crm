"use client";

export function CompaniesSearch({
  value,
  onChange,
  onReset,
}: {
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex max-w-xl flex-1 gap-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search companies"
        className="h-10 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
      />
      {value ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm"
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}
