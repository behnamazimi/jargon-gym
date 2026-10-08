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
import { getPublicCollectionPage, listPublicCollectionSummaries } from "@/lib/terms/public-terms";
import { cn } from "@/lib/utils";

export const revalidate = 86400;
export const dynamicParams = true;

type PageParams = { collectionSlug: string };

export async function generateStaticParams() {
  const collections = await listPublicCollectionSummaries();
  return collections.map((collection) => ({ collectionSlug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { collectionSlug } = await params;
  const data = await getPublicCollectionPage(collectionSlug);
  if (!data) return {};

  const { collection } = data;
  const title =
    collection.kind === "vocabulary"
      ? `${collection.name}: ${kindLine(collection.kind, collection.language)}`
      : `${collection.name} terms explained`;
  const description =
    collection.description ||
    `${countLabel(collection.kind, data.totalTerms)} in ${collection.name}.`;
  const url = `${getPublicBaseUrl()}/collections/${collectionSlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${title} | Lobyas`, description, url },
  };
}

export default async function PublicCollectionPage({ params }: { params: Promise<PageParams> }) {
  const { collectionSlug } = await params;
  const data = await getPublicCollectionPage(collectionSlug);
  if (!data) notFound();

  const { collection, terms, totalTerms } = data;
  const override = showcaseOverride(collection.slug);
  const base = getPublicBaseUrl();
  const url = `${base}/collections/${collection.slug}`;

  return (
    <div className={cn(pageContainerClass, "landing-enter flex-1 py-10 pb-24 sm:py-16 lg:py-20")}>
      <JsonLd
        data={definedTermSet({
          name: collection.name,
          description: collection.description,
          url,
          inLanguage: collection.language,
          terms: terms.map((term) => ({ name: term.term, description: term.definition })),
        })}
      />
      <JsonLd
        data={breadcrumbs([
          { name: "Collections", url: `${base}/collections` },
          { name: collection.name, url },
        ])}
      />
      <CollectionHero
        collection={collection}
        termCount={totalTerms}
        headline={override.headline}
        audience={override.audience}
      />

      <div className="mt-16 sm:mt-24">
        {terms.length === 0 ? (
          <p className="m-0 text-base text-base-content/70">No public terms yet.</p>
        ) : (
          <>
            <TermCardGrid language={collection.language} terms={terms} />
            {totalTerms > terms.length ? (
              <p className="mt-8 m-0 text-base text-base-content/70">
                Showing the newest {terms.length} of {countLabel(collection.kind, totalTerms)}. Add
                the collection to Lobyas to study all of them.
              </p>
            ) : null}
          </>
        )}
      </div>

      <ClosingCta
        title={
          <>
            Learn all {countLabel(collection.kind, totalTerms)}.{" "}
            <span className="text-primary-text">Free to start.</span>
          </>
        }
        body="Free to start: you get AI credits when you join and a refill every month. Read, Review and simple quizzes never use credits, and there are no due dates to fall behind on."
        collection={{ id: collection.id, name: collection.name, canAdd: collection.canAdd }}
      />
    </div>
  );
}
