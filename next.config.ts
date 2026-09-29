import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import { LEGACY_ADMIN_REDIRECTS } from "./lib/redirects";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["react-aria-components", "lucide-react"],
  },
  async redirects() {
    return LEGACY_ADMIN_REDIRECTS;
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

export default withSerwist(nextConfig);
