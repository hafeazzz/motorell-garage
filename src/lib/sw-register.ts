/**
 * Registers public/sw.js (static-asset caching only — see that file for
 * what it does and doesn't cache). Call once on client mount.
 *
 * @param onUpdateAvailable called when a new service worker has installed
 * and is waiting to take over — i.e. this deploy shipped new build assets.
 * The caller decides what to do (e.g. show a "refresh to update" banner);
 * this module never reloads the page on its own.
 */
export function registerServiceWorker(onUpdateAvailable?: () => void): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            // "installed" + an existing controller means this is an update
            // to an already-active SW, not the very first install.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              onUpdateAvailable?.();
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
