"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {
    error: null,
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        background: "#000",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
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

          {state?.error && (
            <p style={{ color: "#E7B183", fontSize: 13, margin: 0 }}>{state.error}</p>
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
