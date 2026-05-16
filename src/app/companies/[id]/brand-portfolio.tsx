"use client";

/* eslint-disable @next/next/no-img-element -- CRM logos intentionally use native lazy-loaded images. */

import { useMemo, useState } from "react";
import { ExternalLink, Tags, X } from "lucide-react";

type Brand = {
  id: string;
  brand_name: string | null;
  website: string | null;
  brand_logo_url: string | null;
  brand_description: string | null;
  country: string | null;
};

const PREVIEW_COUNT = 7;

export function BrandPortfolio({ brands }: { brands: Brand[] }) {
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const activeBrand = useMemo(
    () => brands.find((brand) => brand.id === activeBrandId) ?? null,
    [activeBrandId, brands],
  );

  const previewBrands = brands.slice(0, PREVIEW_COUNT);
  const hiddenCount = Math.max(0, brands.length - PREVIEW_COUNT);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {previewBrands.map((brand) => (
          <BrandTile key={brand.id} brand={brand} onClick={() => setActiveBrandId(brand.id)} />
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/40"
          >
            +{hiddenCount} more
          </button>
        ) : null}
      </div>

      {showAll ? (
        <Modal title="All brands" onClose={() => setShowAll(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {brands.map((brand) => (
              <BrandTile
                key={brand.id}
                brand={brand}
                compact
                onClick={() => {
                  setShowAll(false);
                  setActiveBrandId(brand.id);
                }}
              />
            ))}
          </div>
        </Modal>
      ) : null}

      {activeBrand ? <BrandDetailModal brand={activeBrand} onClose={() => setActiveBrandId(null)} /> : null}
    </>
  );
}

function BrandTile({
  brand,
  onClick,
  compact = false,
}: {
  brand: Brand;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 text-center hover:bg-muted/50 ${
        compact ? "min-h-28" : "min-h-24"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted">
        {brand.brand_logo_url ? (
          <img src={brand.brand_logo_url} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <Tags size={22} className="text-primary" aria-hidden="true" />
        )}
      </div>
      <div className="line-clamp-2 text-primary">{brand.brand_name ?? "Unnamed brand"}</div>
    </button>
  );
}

function BrandDetailModal({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  return (
    <Modal title={brand.brand_name ?? "Brand"} onClose={onClose}>
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
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" onClick={onClose} className="absolute inset-0 bg-primary/35" />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h4 className="truncate text-lg font-semibold text-primary">{title}</h4>
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
