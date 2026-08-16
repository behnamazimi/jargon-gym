import type { MetadataRoute } from "next";
import { getPublicBaseUrl } from "@/lib/seo/base-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/jargon", "/login", "/signup", "/complete-signup", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
