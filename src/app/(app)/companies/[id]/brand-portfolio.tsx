"use client";

/* eslint-disable @next/next/no-img-element -- CRM logos intentionally use native lazy-loaded images. */

import { useMemo, useState } from "react";
import { Tags } from "lucide-react";
import { BrandDetailModal, BrandModalShell, type BrandDetailPreview } from "@/components/brands/brand-detail-modal";

type Brand = BrandDetailPreview;

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
        <BrandModalShell title="All brands" onClose={() => setShowAll(false)}>
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
        </BrandModalShell>
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
