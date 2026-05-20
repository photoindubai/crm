import Link from "next/link";

export type ParticipationSection = {
  id: string;
  name: string;
};

const SECTION_PILL_STYLES = [
  "bg-slate-800 text-white hover:bg-slate-700",
  "bg-blue-600 text-white hover:bg-blue-500",
  "bg-emerald-700 text-white hover:bg-emerald-600",
  "bg-violet-700 text-white hover:bg-violet-600",
  "bg-amber-700 text-white hover:bg-amber-600",
] as const;

export function ParticipationSectionBadges({
  sections,
  eventId,
}: {
  sections: ParticipationSection[];
  eventId?: string | null;
}) {
  if (sections.length === 0) {
    return <span className="text-xs text-muted-foreground">No sections</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {sections.map((section, index) => {
        const className = `inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${SECTION_PILL_STYLES[index % SECTION_PILL_STYLES.length]}`;

        if (eventId) {
          return (
            <Link
              key={section.id}
              href={`/events/${eventId}?section=${section.id}`}
              className={className}
              title={section.name}
            >
              {section.name}
            </Link>
          );
        }

        return (
          <span key={section.id} className={className} title={section.name}>
            {section.name}
          </span>
        );
      })}
    </div>
  );
}
