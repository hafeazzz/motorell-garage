import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Motorell Garage",
  description: "Internal tools for the garage team",
  // Home-screen install on iOS: opens full-screen like a native app.
  appleWebApp: { capable: true, title: "Motorell", statusBarStyle: "black" },
};

// App-like viewport, same as Motorell Ops: no pinch/double-tap zoom (which
// also stops iOS auto-zooming into inputs), content extends under the notch
// / home indicator (padded back via env(safe-area-inset-*)), and the
// browser chrome takes the app's colour.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#17171b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegistrar />
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
