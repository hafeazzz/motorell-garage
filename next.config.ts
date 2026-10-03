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
    // Keep a visited/prefetched tab in the client router cache for 30s, so
    // flipping back and forth between bottom-nav tabs is instant instead of
    // a fresh server render every tap. Any server action that calls
    // revalidatePath()/router.refresh() still clears it immediately, so your
    // own changes always show up right away.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
