import type { MetadataRoute } from "next";

/** Makes the site installable as an app ("Add to Home screen"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Norvane Express",
    short_name: "Norvane",
    description: "Track shipments and arrange international deliveries with Norvane Express.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1F44",
    theme_color: "#0B1F44",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Track a shipment", short_name: "Track", url: "/track", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Request a pickup", short_name: "Ship", url: "/ship", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
