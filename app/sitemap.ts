import type { MetadataRoute } from "next";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicBaseUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/how-terms-work`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/how-smart-queue-works`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const supabase = createPublicClient();
  const { data: terms, error } = await supabase
    .from("terms")
    .select("slug, updated_at, domains!inner(slug, is_public)")
    .eq("domains.is_public", true)
    .not("slug", "is", null);
  if (error) throw error;

  const termRoutes: MetadataRoute.Sitemap = (terms ?? [])
    .filter((row) => row.domains.slug)
    .map((row) => ({
      url: `${baseUrl}/t/${row.domains.slug}/${row.slug}`,
      lastModified: row.updated_at,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...termRoutes];
}
