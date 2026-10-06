import { OG_CONTENT_TYPE, OG_SIZE, renderSpecimenImage } from "@/lib/seo/og/specimen-image";
import { countLabel, kindLine } from "@/lib/terms/kinds";
import { getPublicDomainPage } from "@/lib/terms/public-terms";

export const revalidate = 86400;
export const alt = "A Lobyas collection";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ domainSlug: string }> }) {
  const { domainSlug } = await params;
  const data = await getPublicDomainPage(domainSlug);
  if (!data) return renderSpecimenImage({ kicker: "Lobyas", heading: "Collections" });

  const { domain, totalTerms, specimen } = data;

  return renderSpecimenImage({
    kicker: `${domain.name} · ${kindLine(domain.kind, domain.language)}`,
    heading: specimen?.term ?? domain.name,
    body: specimen?.definition ?? domain.description,
    footer: `${countLabel(domain.kind, totalTerms)} in ${domain.name}`,
  });
}
