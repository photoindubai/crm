"use client";

import { useQueryClient } from "@tanstack/react-query";

export function LogoutForm() {
  const queryClient = useQueryClient();

  return (
    <form
      action="/logout"
      method="post"
      className="mt-6"
      onSubmit={() => {
        queryClient.clear();
      }}
    >
      <button className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        Sign out
      </button>
    </form>
  );
}
