import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryAnchor } from "@/components/collections/term-card-grid";
import { TermPageBlock } from "@/components/collections/term-page-block";
import { JsonLd } from "@/components/seo/json-ld";
import { TermBody } from "@/components/terms/term-body";
import {
  getPublicDomainPage,
  getPublicTermPage,
  listPublicTermPaths,
} from "@/lib/terms/public-terms";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import { breadcrumbs, definedTerm } from "@/lib/seo/json-ld";

export const revalidate = 3600;
export const dynamicParams = true;

type PageParams = { domainSlug: string; termSlug: string };

export async function generateStaticParams() {
  const paths = await listPublicTermPaths();
  return paths;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { domainSlug, termSlug } = await params;
  const data = await getPublicTermPage(domainSlug, termSlug);
  if (!data) return {};

  const title = `${data.term.term}, ${data.domain.name}`;
  const description = data.term.definition.slice(0, 155);
  const url = `${getPublicBaseUrl()}/collections/${domainSlug}/${termSlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${title} | Lobyas`,
      description,
      url,
    },
  };
}

export default async function PublicTermPage({ params }: { params: Promise<PageParams> }) {
  const { domainSlug, termSlug } = await params;
  const [data, collection] = await Promise.all([
    getPublicTermPage(domainSlug, termSlug),
    getPublicDomainPage(domainSlug),
  ]);
  if (!data || !collection) notFound();

  const { domain, term, relatedTermSlugsById } = data;

  const base = getPublicBaseUrl();
  const setUrl = `${base}/collections/${domain.slug}`;
  const url = `${setUrl}/${term.slug}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-10">
      <JsonLd
        data={definedTerm({
          name: term.term,
          description: term.definition,
          url,
          inLanguage: domain.language,
          set: { name: domain.name, url: setUrl },
        })}
      />
      <JsonLd
        data={breadcrumbs([
          { name: "Collections", url: `${base}/collections` },
          { name: domain.name, url: setUrl },
          { name: term.term, url },
        ])}
      />
      <p className="text-sm font-medium tracking-wider text-base-content/70 uppercase">
        <Link
          href={`/collections/${domain.slug}`}
          className="text-base-content/70 underline underline-offset-2 transition-colors hover:text-base-content"
        >
          {domain.name}
        </Link>
        {term.category ? (
          <>
            {" "}
            ·{" "}
            <Link
              href={`/collections/${domain.slug}#${categoryAnchor(term.category)}`}
              className="text-base-content/70 underline underline-offset-2 transition-colors hover:text-base-content"
            >
              {term.category}
            </Link>
          </>
        ) : null}
      </p>
      <h1 className="text-3xl font-medium text-base-content">{term.term}</h1>
      <TermBody
        term={term}
        showSearchLink={false}
        language={domain.language}
        getRelationshipHref={(relatedTermId) => {
          const relatedSlug = relatedTermSlugsById.get(relatedTermId);
          return relatedSlug ? `/collections/${domain.slug}/${relatedSlug}` : undefined;
        }}
      />
      <TermPageBlock domain={domain} current={term} terms={collection.terms} />
    </div>
  );
}
