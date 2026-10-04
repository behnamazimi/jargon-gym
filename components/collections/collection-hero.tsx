import Link from "next/link";
import { PublicCta } from "@/components/public/public-cta";
import { SplitWithScene } from "@/components/public/split-with-scene";
import { kindLine } from "@/lib/terms/kinds";
import type { PublicDomain } from "@/lib/terms/public-terms";
import { CollectionScene } from "./collection-scene";

type CollectionHeroProps = {
  domain: PublicDomain;
  termCount: number;
  headline?: string;
  audience?: string;
};

export function CollectionHero({ domain, termCount, headline, audience }: CollectionHeroProps) {
  const lang = domain.language === "en" ? undefined : domain.language;

  return (
    <SplitWithScene scene={<CollectionScene kind={domain.kind} />} hideSceneOnPhone>
      <p className="m-0 text-sm text-base-content/70">
        <Link
          href="/collections"
          className="text-base-content/70 underline underline-offset-2 hover:text-base-content"
        >
          Collections
        </Link>
        <span className="mx-1.5 text-base-content/50" aria-hidden>
          /
        </span>
        {kindLine(domain.kind, domain.language)}
        <span className="mx-1.5 text-base-content/50" aria-hidden>
          ·
        </span>
        <span className="tabular-nums">{termCount}</span>
      </p>
      <h1
        lang={headline ? undefined : lang}
        className="mt-4 m-0 max-w-[16ch] text-balance text-[clamp(2.5rem,4vw+1rem,4.25rem)] font-medium leading-[1.05] tracking-tight [overflow-wrap:anywhere]"
      >
        {headline ?? domain.name}
      </h1>
      {domain.description ? (
        <p className="mt-6 m-0 max-w-[44ch] text-lg leading-relaxed text-base-content/85">
          {domain.description}
        </p>
      ) : null}
      {audience ? (
        <p className="mt-3 m-0 max-w-[44ch] text-base leading-relaxed text-base-content/70">
          {audience}
        </p>
      ) : null}
      <p className="mt-6 m-0 max-w-[44ch] text-base leading-relaxed text-base-content/85">
        Lobyas brings these back across Read, Review and Quiz until they stick.
      </p>
      <div className="mt-8">
        <PublicCta collection={{ id: domain.id, name: domain.name, canAdd: domain.canAdd }} />
      </div>
    </SplitWithScene>
  );
}
