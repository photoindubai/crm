"use client";

import { useActionState } from "react";
import Image from "next/image";
import { KeyRound } from "lucide-react";
import { login, sendMagicLink, signInWithGoogle, type LoginState } from "./actions";
import googleIcon from "./g-about-gatg.png";

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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-primary hover:bg-slate-50"
        >
          <Image src={googleIcon} alt="" width={16} height={16} />
          Continue with Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        <div className="h-px flex-1 bg-slate-300" />
        <span>Or sign in with email</span>
        <div className="h-px flex-1 bg-slate-300" />
      </div>

      <form action={passwordAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="password-email" className="text-sm font-semibold text-primary">
            Email
          </label>
          <input
            id="password-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@company.com"
            className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-primary"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-semibold text-primary">
              Password
            </label>
            <span className="text-xs font-medium text-slate-500">Forgot password?</span>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-primary"
          />
        </div>
        <FormMessage state={passwordState} />
        <button
          type="submit"
          disabled={passwordPending}
          className="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {passwordPending ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="h-px bg-slate-300" />

      <form action={magicAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="magic-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Magic link email
          </label>
          <input
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@company.com"
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={magicPending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <KeyRound size={15} aria-hidden="true" />
          {magicPending ? "Sending..." : "Sign in via Magic Link"}
        </button>
        <FormMessage state={magicState} />
      </form>

      <p className="pt-1 text-center text-xs text-slate-500">
        Don&apos;t have an account? <span className="font-semibold text-primary">Request access</span>
      </p>
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
