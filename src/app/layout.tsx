import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motorell Garage",
  description: "Internal tools for the garage team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
