"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type SignInState } from "./actions";

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
  return <p style={{ color: "#E7B183", fontSize: 13, margin: 0 }}>{urlError}</p>;
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {
    error: null,
  });

  return (
    <div
      style={{
        // 100dvh, not 100vh — on mobile browsers 100vh is taller than the
        // visible viewport (URL bar), which pushed content below the fold.
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "100%",
          overflowY: "auto",
          background: "var(--bg-app)",
          padding: "64px 28px 40px",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "linear-gradient(135deg,#4A2A63,#E4715A)",
            margin: "0 auto 18px",
          }}
        />
        <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 800, margin: 0 }}>
          Motorell <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Garage</span>
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-secondary)",
            marginTop: 8,
            marginBottom: 40,
          }}
        >
          Internal tools for the garage team
        </p>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={fieldLabel}>Email</label>
            <input name="email" type="email" required autoComplete="email" style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>Password</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={fieldInput}
            />
          </div>

          {state?.error ? (
            <p style={{ color: "#E7B183", fontSize: 13, margin: 0 }}>{state.error}</p>
          ) : (
            <Suspense fallback={null}>
              <UrlError />
            </Suspense>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              marginTop: 8,
              background: "var(--accent-green)",
              color: "#04241A",
              fontWeight: 700,
              fontSize: 14,
              padding: 14,
              borderRadius: 16,
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", marginTop: 24 }}>
          Accounts are created by the owner from the Team page — there's no
          self-signup. Ask the owner if you don&apos;t have credentials yet.
        </p>
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "var(--text-secondary)",
  marginBottom: 5,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  background: "var(--card-bg-alt)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: "10px 12px",
  color: "var(--text-primary)",
  fontSize: 14,
};
