import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TermBody } from "@/components/jargon/term-body";
import { getPublicTermPage, listPublicTermPaths } from "@/lib/jargon/public/public-terms";
import { getPublicBaseUrl } from "@/lib/seo/base-url";

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

  const title = `${data.term.term} — ${data.domain.name} | Jargon Gym`;
  const description = data.term.definition.slice(0, 155);
  const url = `${getPublicBaseUrl()}/j/${domainSlug}/${termSlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
    },
  };
}

export default async function PublicTermPage({ params }: { params: Promise<PageParams> }) {
  const { domainSlug, termSlug } = await params;
  const data = await getPublicTermPage(domainSlug, termSlug);
  if (!data) notFound();

  const { domain, term, relatedTermSlugsById } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-10">
      <p className="text-sm font-medium tracking-wide text-base-content/55 uppercase">
        <Link
          href={`/j/${domain.slug}`}
          className="text-base-content/55 underline underline-offset-2 transition-colors hover:text-base-content"
        >
          {domain.name}
        </Link>{" "}
        ·{" "}
        <Link
          href={`/j/${domain.slug}?category=${encodeURIComponent(term.category)}`}
          className="text-base-content/55 underline underline-offset-2 transition-colors hover:text-base-content"
        >
          {term.category}
        </Link>
      </p>
      <h1 className="text-3xl font-semibold text-base-content">{term.term}</h1>
      <TermBody
        term={term}
        showSearchLink={false}
        getRelationshipHref={(relatedTermId) => {
          const relatedSlug = relatedTermSlugsById.get(relatedTermId);
          return relatedSlug ? `/j/${domain.slug}/${relatedSlug}` : undefined;
        }}
      />
    </div>
  );
}
