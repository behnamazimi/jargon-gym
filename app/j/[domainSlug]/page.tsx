import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DomainTermsList } from "@/components/jargon/public/domain-terms-list";
import { getPublicDomainPage, listPublicDomains } from "@/lib/jargon/public/public-terms";
import { getPublicBaseUrl } from "@/lib/seo/base-url";

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

  const title = `${data.domain.name} | Jargon Gym`;
  const description = data.domain.description || `Terms and definitions in ${data.domain.name}.`;
  const url = `${getPublicBaseUrl()}/j/${domainSlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url },
  };
}

export default async function PublicDomainPage({ params }: { params: Promise<PageParams> }) {
  const { domainSlug } = await params;
  const data = await getPublicDomainPage(domainSlug);
  if (!data) notFound();

  const { domain, terms } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <Link
          href="/j"
          className="inline-flex items-center gap-1 text-sm text-base-content/55 no-underline hover:text-base-content hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden strokeWidth={1.5} />
          All jargon collections
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-base-content">{domain.name}</h1>
        {domain.description ? (
          <p className="mt-1 text-base text-base-content/65">{domain.description}</p>
        ) : null}
      </div>

      {terms.length === 0 ? (
        <p className="text-base text-base-content/55">No public terms yet.</p>
      ) : (
        <Suspense>
          <DomainTermsList domainSlug={domain.slug} terms={terms} />
        </Suspense>
      )}
    </div>
  );
}
