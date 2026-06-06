"use client";

export function CompaniesMineToggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (mine: boolean) => void;
}) {
  const itemClass = (selected: boolean) =>
    `inline-flex h-9 items-center px-3 text-sm font-medium ${
      selected ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:bg-muted"
    }`;

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      <button type="button" onClick={() => onChange(false)} className={itemClass(!active)}>
        All
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`${itemClass(active)} border-l border-border`}
      >
        Mine
      </button>
    </div>
  );
}
