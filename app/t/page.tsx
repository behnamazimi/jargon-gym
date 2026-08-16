import type { Metadata } from "next";
import Link from "next/link";
import { listPublicDomains } from "@/lib/jargon/public/public-terms";
import { getPublicBaseUrl } from "@/lib/seo/base-url";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Jargon | Jargon Gym",
  description: "Browse public jargon collections and look up what terms actually mean.",
  alternates: { canonical: `${getPublicBaseUrl()}/t` },
};

export default async function PublicCollectionsIndexPage() {
  const domains = await listPublicDomains();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold text-base-content">Jargon</h1>
        <p className="mt-1 text-base text-base-content/65">
          Public collections of jargon, explained in plain language.
        </p>
      </div>

      {domains.length === 0 ? (
        <p className="text-base text-base-content/55">No public jargon yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {domains.map((domain) => (
            <li key={domain.id}>
              <Link
                href={`/t/${domain.slug}`}
                className="block rounded-lg border border-base-300 bg-base-100 px-4 py-3 no-underline transition-colors duration-150 hover:border-primary/50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-semibold text-base-content">{domain.name}</span>
                  <span className="shrink-0 text-sm text-base-content/55">
                    {domain.termCount} term{domain.termCount === 1 ? "" : "s"}
                  </span>
                </div>
                {domain.description ? (
                  <p className="m-0 mt-1 line-clamp-2 text-sm text-base-content/65">
                    {domain.description}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
