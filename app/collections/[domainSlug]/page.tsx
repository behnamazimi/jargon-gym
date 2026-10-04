import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/collections/collection-hero";
import { TermCardGrid } from "@/components/collections/term-card-grid";
import { pageContainerClass } from "@/components/page-container";
import { ClosingCta } from "@/components/public/closing-cta";
import { showcaseOverride } from "@/lib/collections/showcase-overrides";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import { countLabel, kindLine } from "@/lib/terms/kinds";
import { getPublicDomainPage, listPublicDomains } from "@/lib/terms/public-terms";
import { cn } from "@/lib/utils";

export const revalidate = 3600;
export const dynamicParams = true;

type PageParams = { domainSlug: string };

export async function generateStaticParams() {
  const domains = await listPublicDomains();
  return domains.map((domain) => ({ domainSlug: domain.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { domainSlug } = await params;
  const data = await getPublicDomainPage(domainSlug);
  if (!data) return {};

  const { domain } = data;
  const title =
    domain.kind === "vocabulary"
      ? `${domain.name}: ${kindLine(domain.kind, domain.language)}`
      : `${domain.name} terms explained`;
  const description =
    domain.description || `${countLabel(domain.kind, data.terms.length)} in ${domain.name}.`;
  const url = `${getPublicBaseUrl()}/collections/${domainSlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${title} | Lobyas`, description, url },
  };
}

export default async function PublicDomainPage({ params }: { params: Promise<PageParams> }) {
  const { domainSlug } = await params;
  const data = await getPublicDomainPage(domainSlug);
  if (!data) notFound();

  const { domain, terms } = data;
  const override = showcaseOverride(domain.slug);

  return (
    <div className={cn(pageContainerClass, "landing-enter flex-1 py-10 pb-24 sm:py-16 lg:py-20")}>
      <CollectionHero
        domain={domain}
        termCount={terms.length}
        headline={override.headline}
        audience={override.audience}
      />

      <div className="mt-16 sm:mt-24">
        {terms.length === 0 ? (
          <p className="m-0 text-base text-base-content/70">No public terms yet.</p>
        ) : (
          <TermCardGrid domainSlug={domain.slug} language={domain.language} terms={terms} />
        )}
      </div>

      <ClosingCta
        title={
          <>
            Learn all {countLabel(domain.kind, terms.length)}.{" "}
            <span className="text-primary-text">Free.</span>
          </>
        }
        body="Read, review and quiz them in Lobyas, with no due dates to fall behind on."
        collection={{ id: domain.id, name: domain.name, canAdd: domain.canAdd }}
      />
    </div>
  );
}
