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
};

export default nextConfig;
