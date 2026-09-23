"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/sw-register";
import { Button } from "@/components/ui/button";

export function ServiceWorkerRegistrar() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    registerServiceWorker(() => setUpdateAvailable(true));
  }, []);

  if (!updateAvailable) return null;

  // Fixed to the top, not the bottom — the (app) shell's BottomNav sits at
  // the bottom of the viewport and a fixed overlay there would cover its
  // tap targets and block navigation entirely.
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 text-sm">
      <span>A new version is available.</span>
      <Button size="sm" onClick={() => window.location.reload()}>
        Refresh
      </Button>
    </div>
  );
}
