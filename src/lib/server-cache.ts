import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import type { CacheTag } from "@/lib/cache/tags";

type CacheKeyPart = string | number | boolean | null | undefined;

type CachedLoaderOptions = {
  keyParts: CacheKeyPart[];
  tags: CacheTag[];
  revalidateSeconds?: number;
};

export async function loadCached<T>(
  { keyParts, tags, revalidateSeconds }: CachedLoaderOptions,
  loader: () => Promise<T>,
) {
  if (revalidateSeconds === undefined) {
    throw new Error("loadCached requires revalidateSeconds from CACHE_TTL");
  }
  return unstable_cache(loader, keyParts.map((part) => String(part ?? "")), {
    tags,
    revalidate: revalidateSeconds,
  })();
}

export function invalidateCacheTags(tags: CacheTag[]) {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}
