"use client";

/* eslint-disable @next/next/no-img-element -- CRM media previews intentionally use native elements. */

import { useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Folder, Image as ImageIcon, PlayCircle, X } from "lucide-react";

export type MediaItem = {
  id: string;
  title: string;
  url: string;
  subtitle?: string | null;
  description?: string | null;
};

export function MediaThumbnailButton({
  item,
  className,
  imageClassName,
  fallbackClassName,
}: {
  item: MediaItem;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const isImage = useMemo(() => isImageUrl(item.url), [item.url]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {isImage ? (
          <img src={item.url} alt="" loading="lazy" className={imageClassName} />
        ) : (
          <span className={fallbackClassName}>
            <MediaIcon url={item.url} />
          </span>
        )}
      </button>
      {open ? <MediaPreviewModal item={item} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function MediaCardGrid({ items }: { items: MediaItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = items.find((item) => item.id === activeId) ?? null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
            className="flex min-h-24 items-start gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/40"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {isImageUrl(item.url) ? (
                <img src={item.url} alt="" loading="lazy" className="h-full w-full object-contain" />
              ) : (
                <MediaIcon url={item.url} />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-primary">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.subtitle ?? "No status"}</div>
              {item.description ? <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</div> : null}
            </div>
          </button>
        ))}
      </div>
      {activeItem ? <MediaPreviewModal item={activeItem} onClose={() => setActiveId(null)} /> : null}
    </>
  );
}

function MediaPreviewModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const isImage = isImageUrl(item.url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" onClick={onClose} className="absolute inset-0 bg-primary/35" />
      <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h4 className="truncate text-lg font-semibold text-primary">{item.title}</h4>
            {item.subtitle ? <div className="mt-1 text-xs text-muted-foreground">{item.subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-73px)] overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              {isImage ? (
                <img src={item.url} alt="" className="max-h-[60vh] w-full object-contain" />
              ) : (
                <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary shadow-soft">
                    <MediaIcon url={item.url} large />
                  </span>
                  <p className="max-w-md text-sm">Preview is not available for this file type. You can open or download it directly.</p>
                </div>
              )}
            </div>
            {item.description ? <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
            <div className="flex flex-wrap gap-3">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-medium text-primary hover:bg-muted"
              >
                Open file
                <ExternalLink size={15} aria-hidden="true" />
              </a>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Download
                <Download size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaIcon({ url, large = false }: { url: string; large?: boolean }) {
  const size = large ? 28 : 20;

  if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(url)) {
    return <ImageIcon size={size} aria-hidden="true" />;
  }

  if (/\.(mp4|mov|webm|avi)(\?|#|$)/i.test(url)) {
    return <PlayCircle size={size} aria-hidden="true" />;
  }

  if (/folder|drive\.google\.com\/drive\/folders/i.test(url)) {
    return <Folder size={size} aria-hidden="true" />;
  }

  return <FileText size={size} aria-hidden="true" />;
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(url);
}
