"use client";

import { useEffect, useRef, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/query/client";

export function QueryProvider({
  children,
  userId,
  orgId,
}: {
  children: React.ReactNode;
  userId: string;
  orgId: string;
}) {
  const [queryClient] = useState(makeQueryClient);
  const cacheScopeRef = useRef<string | null>(null);
  const cacheScope = `${userId}:${orgId}`;

  useEffect(() => {
    if (cacheScopeRef.current !== null && cacheScopeRef.current !== cacheScope) {
      queryClient.clear();
    }
    cacheScopeRef.current = cacheScope;
  }, [cacheScope, queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
