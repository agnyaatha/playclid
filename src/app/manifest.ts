import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Table Craft",
    short_name: "Table Craft",
    description: "Learn snooker, pool and carrom with a physics-based practice table, guided drills and a beginner curriculum.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#0e7a42",
    categories: ["sports", "education"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
