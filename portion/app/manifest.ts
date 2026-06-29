import type { MetadataRoute } from "next";

// Web App Manifest — makes Portion installable on Android/iOS home screens and
// drives the standalone (no browser chrome) launch experience. Next serves this
// at /manifest.webmanifest and auto-links it from <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portion — Health + Money",
    short_name: "Portion",
    description:
      "Track your training, diet, body, TikTok growth, and income in one place.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
