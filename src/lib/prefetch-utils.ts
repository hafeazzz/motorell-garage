"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

// Next.js's own <Link> already prefetches automatically once a link enters
// the viewport (App Router default, unless prefetch={false} is passed) —
// for BottomNav specifically, every item is always on-screen, so it's
// already prefetched effectively on mount. This hook exists for the case
// that actually needs it: a link that isn't always in the viewport (e.g.
// scrolled out of view, or rendered off-screen in a drawer), where an
// explicit hover-triggered prefetch is the only chance to get ahead of the
// click. Wire it to onMouseEnter/onFocus on the element, not onClick.
export function usePrefetchOnHover() {
  const router = useRouter();
  return useCallback(
    (route: string) => {
      router.prefetch(route);
    },
    [router]
  );
}
