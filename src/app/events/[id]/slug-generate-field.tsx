"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

export function SlugGenerateField({
  name,
  sourceValue,
  sourceInputId,
  defaultValue,
  label = "Slug",
}: {
  name: string;
  sourceValue?: string;
  sourceInputId?: string;
  defaultValue?: string;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  const normalizedSource = useMemo(() => sourceValue ?? "", [sourceValue]);

  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-primary">{label}</span>
      <div className="relative">
        <input
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-10 w-full rounded-md border border-border bg-white px-3 pr-28 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => {
            const sourceFromDom =
              sourceInputId && typeof document !== "undefined"
                ? (document.getElementById(sourceInputId) as HTMLInputElement | null)?.value ?? ""
                : "";
            setValue(generateSlug(sourceFromDom || normalizedSource));
          }}
          className="absolute right-2 top-1/2 inline-flex h-7 -translate-y-1/2 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary hover:bg-muted"
        >
          Regenerate
          <RefreshCw size={13} aria-hidden="true" />
        </button>
      </div>
    </label>
  );
}

function generateSlug(input: string) {
  const fromCyrillic: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  const transliterated = input
    .toLowerCase()
    .split("")
    .map((char) => fromCyrillic[char] ?? char)
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}
