"use client";

import { RouteError } from "@/components/RouteError";

export default function TeamError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} label="the team roster" />;
}
