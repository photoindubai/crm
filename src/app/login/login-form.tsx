"use client";

import { useActionState } from "react";
import { login, sendMagicLink, signInWithGoogle, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [passwordState, passwordAction, passwordPending] = useActionState(login, initialState);
  const [magicState, magicAction, magicPending] = useActionState(sendMagicLink, initialState);

  return (
    <div className="space-y-5">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm font-medium hover:bg-muted"
        >
          Continue with Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>Email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={magicAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="magic-email" className="text-sm font-medium">
            Magic link
          </label>
          <input
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <FormMessage state={magicState} />
        <button
          type="submit"
          disabled={magicPending}
          className="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {magicPending ? "Sending..." : "Send magic link"}
        </button>
      </form>

      <details className="rounded-md border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">Sign in with password</summary>
        <form action={passwordAction} className="mt-4 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="password-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="password-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <FormMessage state={passwordState} />
          <button
            type="submit"
            disabled={passwordPending}
            className="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {passwordPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </details>
    </div>
  );
}

function FormMessage({ state }: { state: LoginState }) {
  if (state.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </div>
    );
  }

  if (state.message) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.message}
      </div>
    );
  }

  return null;
}
