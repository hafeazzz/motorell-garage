import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Motorell Garage",
  description: "Internal tools for the garage team",
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
