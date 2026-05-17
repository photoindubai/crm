"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORY_OPTIONS = [
  { value: "brochure", label: "Brochure" },
  { value: "company_profile", label: "Company profile" },
  { value: "product_photo", label: "Product photo" },
  { value: "social_media_material", label: "Social media material" },
  { value: "press_release", label: "Press release" },
  { value: "other", label: "Other" },
];

export function ParticipationMaterialUploadForm({ participationId }: { participationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("brochure");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("participationId", participationId);
      formData.set("category", category);
      formData.set("file", file);

      const response = await fetch("/api/files/participation-material", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Upload failed.");
      }

      setMessage("Material uploaded.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={loading}
          className="h-9 rounded-md border border-border bg-white px-2 text-xs text-primary"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted">
          {loading ? "Uploading..." : "Upload file"}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,application/zip"
            className="hidden"
            disabled={loading}
            onChange={(event) => void onFileSelected(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
