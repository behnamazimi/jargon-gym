import type { Metadata } from "next";
import {
  CollectionIndex,
  type CollectionIndexRow,
} from "@/components/collections/collection-index";
import { CollectionsIndexScene } from "@/components/illustrations/scenes/collections-index";
import { pageContainerClass } from "@/components/page-container";
import { ClosingCta } from "@/components/public/closing-cta";
import { SplitWithScene } from "@/components/public/split-with-scene";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import { pickSpecimen } from "@/lib/collections/pick";
import { showcaseOverride } from "@/lib/collections/showcase-overrides";
import { kindLine } from "@/lib/terms/kinds";
import { listPublicCollections } from "@/lib/terms/public-terms";
import { cn } from "@/lib/utils";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Public collections",
  description:
    "Browse public collections of terms from fields and languages, and see what they actually mean.",
  alternates: { canonical: `${getPublicBaseUrl()}/collections` },
};

export default async function PublicCollectionsIndexPage() {
  const collections = await listPublicCollections();
  const rows: CollectionIndexRow[] = collections.map(({ domain, terms }) => {
    const specimen = pickSpecimen(
      domain.slug,
      terms,
      showcaseOverride(domain.slug).specimenTermSlug,
    );
    return {
      slug: domain.slug,
      name: domain.name,
      description: domain.description,
      kindLine: kindLine(domain.kind, domain.language),
      count: terms.length,
      lang: domain.language === "en" ? undefined : domain.language,
      specimen: specimen ? { term: specimen.term, definition: specimen.definition } : null,
    };
  });

  return (
    <div className={cn(pageContainerClass, "landing-enter flex-1 py-10 pb-24 sm:py-16 lg:py-20")}>
      <SplitWithScene scene={<CollectionsIndexScene />} hideSceneOnPhone>
        <p className="m-0 text-sm text-base-content/70">Built-in collections</p>
        <h1 className="mt-4 m-0 max-w-[16ch] text-balance text-[clamp(2.5rem,4vw+1rem,4.25rem)] font-medium leading-[1.05] tracking-tight">
          Pick a field or a language. Learn its words.
        </h1>
        <p className="mt-6 m-0 max-w-[44ch] text-lg leading-relaxed text-base-content/85">
          Real terms from fields and languages, explained in plain language. Read any of them here,
          then study the ones you need in Lobyas.
        </p>
        <p className="mt-3 m-0 max-w-[44ch] text-base leading-relaxed text-base-content/70">
          Made and kept up by Lobyas. Community collections, shared by people who use it, are
          in the app once you sign in.
        </p>
      </SplitWithScene>

      <div className="mt-16 sm:mt-24">
        {rows.length === 0 ? (
          <p className="m-0 text-base text-base-content/70">No public collections yet.</p>
        ) : (
          <CollectionIndex rows={rows} />
        )}
      </div>

      <ClosingCta />
    </div>
  );
}
