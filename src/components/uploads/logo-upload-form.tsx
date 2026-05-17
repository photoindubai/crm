"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function LogoUploadForm({
  endpoint,
  entityField,
  entityId,
  label = "Upload logo",
}: {
  endpoint: string;
  entityField: "companyId" | "brandId" | "participationId";
  entityId: string;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
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
      formData.set(entityField, entityId);
      formData.set("file", file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Upload failed.");
      }

      setMessage("Logo uploaded.");
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
      <label className="inline-flex cursor-pointer items-center rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted">
        {loading ? "Uploading..." : label}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          disabled={loading}
          onChange={(event) => void onFileSelected(event.target.files?.[0] ?? null)}
        />
      </label>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
