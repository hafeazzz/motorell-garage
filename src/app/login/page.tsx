"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type SignInState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const URL_ERROR_MESSAGES: Record<string, string> = {
  "no-profile":
    "Your account isn't set up yet — signed in, but there's no profile for it. Ask the owner to add you from the Team page.",
};

// useSearchParams() opts a static page out of prerendering unless it's
// isolated behind a Suspense boundary (Next.js throws a build error
// otherwise) — split into its own component so only this part waits.
function UrlError() {
  // Set by (app)/layout.tsx when it redirects back here (e.g. ?error=no-profile).
  const searchParams = useSearchParams();
  const urlError = URL_ERROR_MESSAGES[searchParams.get("error") ?? ""];
  if (!urlError) return null;
  return <p className="m-0 text-[13px] text-destructive">{urlError}</p>;
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {
    error: null,
  });

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Motorell" className="mx-auto mb-4 size-16 rounded-2xl" />
          <h1 className="text-2xl font-extrabold">
            Motorell <span className="font-semibold text-muted-foreground">Garage</span>
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">Internal tools for the garage team</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email" className="mb-1.5 text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="your@email.com"
              className="autofill-fix h-11 bg-secondary text-sm"
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-1.5 text-xs text-muted-foreground">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="autofill-fix h-11 bg-secondary text-sm"
            />
          </div>

          {state?.error ? (
            <p className="m-0 text-[13px] text-destructive">{state.error}</p>
          ) : (
            <Suspense fallback={null}>
              <UrlError />
            </Suspense>
          )}

          <Button type="submit" disabled={pending} className="mt-2 w-full py-6 text-sm font-bold active:scale-[0.98]">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Accounts are created by the owner from the Team page — there&apos;s no
          self-signup. Ask the owner if you don&apos;t have credentials yet.
        </p>
      </div>

      {/* Chrome/Safari fill autofilled inputs with a yellow background that
          ignores normal CSS — only the -webkit-box-shadow inset trick
          reliably overrides it. Tailwind's autofill: variant (the :autofill
          standard pseudo-class) doesn't catch this in every browser, so both
          are here as belt-and-suspenders. */}
      <style>{`
        .autofill-fix:-webkit-autofill,
        .autofill-fix:-webkit-autofill:hover,
        .autofill-fix:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px var(--card-bg-alt) inset !important;
          -webkit-text-fill-color: var(--text-primary) !important;
          caret-color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
}
