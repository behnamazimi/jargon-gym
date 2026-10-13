import { getSharedCollectionPreview } from "@/lib/collections/shared-preview";
import { OG_CONTENT_TYPE, OG_SIZE, renderSpecimenImage } from "@/lib/seo/og/specimen-image";
import { countLabel, kindLine } from "@/lib/terms/kinds";

export const alt = "A Lobyas collection";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  const preview = await getSharedCollectionPreview(collectionId);
  if (!preview) return renderSpecimenImage({ kicker: "Lobyas", heading: "Collections" });

  const specimen = preview.terms[0];

  return renderSpecimenImage({
    kicker: `${preview.name} · ${kindLine(preview.kind, preview.language)}`,
    heading: specimen?.term ?? preview.name,
    body: specimen?.definition ?? preview.description,
    footer: `${countLabel(preview.kind, preview.totalTerms)} in ${preview.name}`,
  });
}
