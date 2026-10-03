import type { MetadataRoute } from "next";

// Lets phones "Add to Home Screen" as a standalone app: no browser URL bar,
// own icon, opens straight into the dashboard.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Motorell Garage",
    short_name: "Motorell",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#17171b",
    theme_color: "#17171b",
    icons: [{ src: "/logo.png", sizes: "256x256", type: "image/png", purpose: "any" }],
  };
}
