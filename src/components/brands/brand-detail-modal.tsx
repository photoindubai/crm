"use client";

/* eslint-disable @next/next/no-img-element -- CRM logos intentionally use native lazy-loaded images. */

import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, Tags, X } from "lucide-react";

export type BrandDetailPreview = {
  id: string;
  brand_name: string | null;
  website: string | null;
  brand_logo_url: string | null;
  brand_description: string | null;
  country: string | null;
};

export function BrandDetailModal({ brand, onClose }: { brand: BrandDetailPreview; onClose: () => void }) {
  const title = brand.brand_name ?? "Brand";
  return (
    <BrandModalShell
      title={
        <Link
          href={`/brands/${brand.id}`}
          className="block min-w-0 truncate text-lg font-semibold text-primary hover:underline"
          onClick={() => onClose()}
        >
          {title}
        </Link>
      }
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            {brand.brand_logo_url ? (
              <img src={brand.brand_logo_url} alt="" loading="lazy" className="h-full w-full object-contain" />
            ) : (
              <Tags size={30} className="text-primary" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-sm text-muted-foreground">{brand.country ?? "No country"}</div>
            <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {brand.brand_description ?? "No brand description."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {brand.website ? (
            <a
              href={brand.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-medium text-primary hover:bg-muted"
            >
              Visit website
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ) : null}
          {brand.brand_logo_url ? (
            <a
              href={brand.brand_logo_url}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Download logo
            </a>
          ) : null}
        </div>
      </div>
    </BrandModalShell>
  );
}

export function BrandModalShell({
  title,
  children,
  onClose,
}: {
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" onClick={onClose} className="absolute inset-0 bg-primary/35" />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1 text-lg font-semibold text-primary">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-73px)] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
