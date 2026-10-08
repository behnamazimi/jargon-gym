import createMDX from "@next/mdx";
import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import {
  LEGACY_ADMIN_REDIRECTS,
  LEGACY_APP_REDIRECTS,
  LEGACY_TERM_PAGE_REDIRECTS,
} from "./lib/redirects";

const nextConfig: NextConfig = {
  // End-to-end runs build into their own folder so they never clobber a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || undefined,
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["react-aria-components", "lucide-react"],
    // Issue screenshots are shrunk to 2 MB in the browser; the rest is form overhead.
    serverActions: { bodySizeLimit: "3mb" },
  },
  async redirects() {
    return [...LEGACY_APP_REDIRECTS, ...LEGACY_ADMIN_REDIRECTS, ...LEGACY_TERM_PAGE_REDIRECTS];
  },
  async headers() {
    return [
      {
        source: "/serwist/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX();

export default withSerwist(withMDX(nextConfig));
