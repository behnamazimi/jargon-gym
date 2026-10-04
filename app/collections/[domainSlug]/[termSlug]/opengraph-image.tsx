import { OG_CONTENT_TYPE, OG_SIZE, renderSpecimenImage } from "@/lib/seo/og/specimen-image";
import { kindLine } from "@/lib/terms/kinds";
import { getPublicTermPage } from "@/lib/terms/public-terms";

export const revalidate = 3600;
export const alt = "A term explained on Lobyas";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ domainSlug: string; termSlug: string }>;
}) {
  const { domainSlug, termSlug } = await params;
  const data = await getPublicTermPage(domainSlug, termSlug);
  if (!data) return renderSpecimenImage({ kicker: "Lobyas", heading: "Collections" });

  const { domain, term } = data;
  return renderSpecimenImage({
    kicker: `${domain.name} · ${kindLine(domain.kind, domain.language)}`,
    heading: term.term,
    body: term.definition,
  });
}
