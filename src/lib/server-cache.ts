import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import type { CacheTag } from "./cache-tags";

type CacheKeyPart = string | number | boolean | null | undefined;

type CachedLoaderOptions = {
  keyParts: CacheKeyPart[];
  tags: CacheTag[];
};

export async function loadCached<T>(
  { keyParts, tags }: CachedLoaderOptions,
  loader: () => Promise<T>,
) {
  return unstable_cache(loader, keyParts.map((part) => String(part ?? "")), {
    tags,
  })();
}

export function invalidateCacheTags(tags: CacheTag[]) {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}
