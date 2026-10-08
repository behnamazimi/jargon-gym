import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/collections/collection-hero";
import { TermCardGrid } from "@/components/collections/term-card-grid";
import { pageContainerClass } from "@/components/page-container";
import { ClosingCta } from "@/components/public/closing-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { showcaseOverride } from "@/lib/collections/showcase-overrides";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import { breadcrumbs, definedTermSet } from "@/lib/seo/json-ld";
import { countLabel, kindLine } from "@/lib/terms/kinds";
import { getPublicDomainPage, listPublicDomains } from "@/lib/terms/public-terms";
import { cn } from "@/lib/utils";

export const revalidate = 86400;
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
    domain.description || `${countLabel(domain.kind, data.totalTerms)} in ${domain.name}.`;
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

  const { domain, terms, totalTerms } = data;
  const override = showcaseOverride(domain.slug);
  const base = getPublicBaseUrl();
  const url = `${base}/collections/${domain.slug}`;

  return (
    <div className={cn(pageContainerClass, "landing-enter flex-1 py-10 pb-24 sm:py-16 lg:py-20")}>
      <JsonLd
        data={definedTermSet({
          name: domain.name,
          description: domain.description,
          url,
          inLanguage: domain.language,
          terms: terms.map((term) => ({ name: term.term, description: term.definition })),
        })}
      />
      <JsonLd
        data={breadcrumbs([
          { name: "Collections", url: `${base}/collections` },
          { name: domain.name, url },
        ])}
      />
      <CollectionHero
        domain={domain}
        termCount={totalTerms}
        headline={override.headline}
        audience={override.audience}
      />

      <div className="mt-16 sm:mt-24">
        {terms.length === 0 ? (
          <p className="m-0 text-base text-base-content/70">No public terms yet.</p>
        ) : (
          <>
            <TermCardGrid language={domain.language} terms={terms} />
            {totalTerms > terms.length ? (
              <p className="mt-8 m-0 text-base text-base-content/70">
                Showing the newest {terms.length} of {countLabel(domain.kind, totalTerms)}. Add the
                collection to Lobyas to study all of them.
              </p>
            ) : null}
          </>
        )}
      </div>

      <ClosingCta
        title={
          <>
            Learn all {countLabel(domain.kind, totalTerms)}.{" "}
            <span className="text-primary-text">Free to start.</span>
          </>
        }
        body="Free to start: you get AI credits when you join and a refill every month. Read, Review and simple quizzes never use credits, and there are no due dates to fall behind on."
        collection={{ id: domain.id, name: domain.name, canAdd: domain.canAdd }}
      />
    </div>
  );
}
