import type { MetadataRoute } from "next";
import {
  PWA_BACKGROUND_COLOR,
  PWA_DESCRIPTION,
  PWA_NAME,
  PWA_SCREENSHOT_NARROW,
  PWA_SCREENSHOT_WIDE,
  PWA_SHORT_NAME,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PWA_NAME,
    short_name: PWA_SHORT_NAME,
    description: PWA_DESCRIPTION,
    start_url: PWA_START_URL,
    id: PWA_START_URL,
    scope: "/",
    display: "standalone",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "en",
    categories: ["education"],
    icons: [
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/read-wide.png",
        sizes: `${PWA_SCREENSHOT_WIDE.width}x${PWA_SCREENSHOT_WIDE.height}`,
        type: "image/png",
        form_factor: "wide",
        label: "Read a term on desktop",
      },
      {
        src: "/screenshots/review-wide.png",
        sizes: `${PWA_SCREENSHOT_WIDE.width}x${PWA_SCREENSHOT_WIDE.height}`,
        type: "image/png",
        form_factor: "wide",
        label: "Review terms on desktop",
      },
      {
        src: "/screenshots/quiz-wide.png",
        sizes: `${PWA_SCREENSHOT_WIDE.width}x${PWA_SCREENSHOT_WIDE.height}`,
        type: "image/png",
        form_factor: "wide",
        label: "Quiz yourself on desktop",
      },
      {
        src: "/screenshots/read-narrow.png",
        sizes: `${PWA_SCREENSHOT_NARROW.width}x${PWA_SCREENSHOT_NARROW.height}`,
        type: "image/png",
        form_factor: "narrow",
        label: "Read a term on mobile",
      },
      {
        src: "/screenshots/review-narrow.png",
        sizes: `${PWA_SCREENSHOT_NARROW.width}x${PWA_SCREENSHOT_NARROW.height}`,
        type: "image/png",
        form_factor: "narrow",
        label: "Review terms on mobile",
      },
      {
        src: "/screenshots/quiz-narrow.png",
        sizes: `${PWA_SCREENSHOT_NARROW.width}x${PWA_SCREENSHOT_NARROW.height}`,
        type: "image/png",
        form_factor: "narrow",
        label: "Quiz yourself on mobile",
      },
    ],
    shortcuts: [
      {
        name: "Read",
        short_name: "Read",
        description: "Read terms from your active collections.",
        url: "/jargon/read?source=pwa",
        icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Review",
        short_name: "Review",
        description: "Review terms from your active collections.",
        url: "/jargon/review?source=pwa",
        icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Quiz",
        short_name: "Quiz",
        description: "Quiz yourself on terms from your active collections.",
        url: "/jargon/quiz?source=pwa",
        icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
