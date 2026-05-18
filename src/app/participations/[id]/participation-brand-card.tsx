"use client";

/* eslint-disable @next/next/no-img-element -- CRM logos intentionally use native lazy-loaded images. */

import { useState } from "react";
import { Tags } from "lucide-react";
import { BrandDetailModal, type BrandDetailPreview } from "@/components/brands/brand-detail-modal";
import { DeleteParticipationBrandButton } from "./delete-participation-brand-button";

type BrandLinkRow = {
  id: string;
  brand_id: string | null;
  display_on_website: boolean | null;
  priority: number | null;
};

type BrandRow = Pick<
  BrandDetailPreview,
  "id" | "brand_name" | "website" | "brand_logo_url" | "brand_description" | "country"
>;

export function ParticipationBrandCard({
  participationId,
  link,
  brand,
}: {
  participationId: string;
  link: BrandLinkRow;
  brand: BrandRow;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const preview: BrandDetailPreview = {
    id: brand.id,
    brand_name: brand.brand_name,
    website: brand.website,
    brand_logo_url: brand.brand_logo_url,
    brand_description: brand.brand_description,
    country: brand.country,
  };

  return (
    <>
      <div className="rounded-lg border border-border p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {brand.brand_logo_url ? (
                <img src={brand.brand_logo_url} alt="" loading="lazy" className="h-full w-full object-contain" />
              ) : (
                <Tags size={18} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-primary">{brand.brand_name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {[link.display_on_website ? "website" : "internal only", link.priority != null ? `priority ${link.priority}` : null]
                  .filter(Boolean)
                  .join(" / ") || "Brand link"}
              </div>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <DeleteParticipationBrandButton participationId={participationId} brandLinkId={link.id} brandId={link.brand_id ?? ""} />
          </div>
        </div>
      </div>
      {modalOpen ? <BrandDetailModal brand={preview} onClose={() => setModalOpen(false)} /> : null}
    </>
  );
}
