import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage public bucket for unit photos & profile photos.
    // Replace <project-ref> once the Supabase project is created.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    // (app) pages hold no data (it lives in the client store), so a page
    // once prefetched can be reused for the whole session — tab switches
    // never go back to the server.
    staleTimes: { dynamic: 30, static: 3600 },
  },
};

export default nextConfig;
