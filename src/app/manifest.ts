import type { MetadataRoute } from "next";
import {
  APP_DESCRIPTION,
  APP_ICON_PNG_192,
  APP_ICON_PNG_512,
  APP_NAME,
  APP_TAGLINE,
} from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0c0b",
    theme_color: "#0b0c0b",
    categories: ["health", "lifestyle"],
    icons: [
      { src: APP_ICON_PNG_192, sizes: "192x192", type: "image/png" },
      { src: APP_ICON_PNG_512, sizes: "512x512", type: "image/png" },
      {
        src: APP_ICON_PNG_512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
