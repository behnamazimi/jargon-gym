import { OG_CONTENT_TYPE, OG_SIZE, renderSpecimenImage } from "@/lib/seo/og/specimen-image";
import { countLabel, kindLine } from "@/lib/terms/kinds";
import { getPublicCollectionPage } from "@/lib/terms/public-terms";

export const revalidate = 86400;
export const alt = "A Lobyas collection";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ collectionSlug: string }> }) {
  const { collectionSlug } = await params;
  const data = await getPublicCollectionPage(collectionSlug);
  if (!data) return renderSpecimenImage({ kicker: "Lobyas", heading: "Collections" });

  const { collection, totalTerms, specimen } = data;

  return renderSpecimenImage({
    kicker: `${collection.name} · ${kindLine(collection.kind, collection.language)}`,
    heading: specimen?.term ?? collection.name,
    body: specimen?.definition ?? collection.description,
    footer: `${countLabel(collection.kind, totalTerms)} in ${collection.name}`,
  });
}
