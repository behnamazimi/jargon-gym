import { AllInOneScene } from "@/components/illustrations/scenes/all-in-one";
import { pageContainerClass } from "@/components/page-container";
import { ClosingCta } from "@/components/public/closing-cta";
import { PublicCta } from "@/components/public/public-cta";
import { SplitWithScene } from "@/components/public/split-with-scene";
import { FEATURE_SECTIONS } from "@/lib/features/sections";
import { cn } from "@/lib/utils";
import { FeatureCards } from "./feature-cards";
import { FeatureSplit } from "./feature-split";
import { FeaturesContents } from "./features-contents";

function splitPosition(index: number) {
  return FEATURE_SECTIONS.slice(0, index).filter((section) => section.layout === "split").length;
}

export function FeaturesPage() {
  return (
    <div className={cn(pageContainerClass, "landing-enter flex-1 py-10 pb-24 sm:py-16 lg:py-20")}>
      <SplitWithScene scene={<AllInOneScene />}>
        <p className="m-0 mb-3 font-mono text-sm tracking-widest text-primary-text">FEATURES</p>
        <h1 className="m-0 max-w-[16ch] text-balance text-[clamp(2.5rem,4vw+1rem,4rem)] font-medium leading-[1.05] tracking-tight">
          Everything Lobyas does, in the order you&apos;ll need it
        </h1>
        <p className="mt-6 m-0 max-w-[44ch] text-lg leading-relaxed text-base-content/85">
          From getting your first terms in, to hearing them, to seeing what has stuck. Here is the
          full list.
        </p>
        <div className="mt-8">
          <PublicCta />
        </div>
      </SplitWithScene>

      <FeaturesContents sections={FEATURE_SECTIONS} />

      {FEATURE_SECTIONS.map((section, index) => {
        const number = index + 1;
        switch (section.layout) {
          case "split":
            return (
              <FeatureSplit
                key={section.id}
                section={section}
                number={number}
                flipped={splitPosition(index) % 2 === 1}
              />
            );
          case "cards":
            return <FeatureCards key={section.id} section={section} number={number} />;
        }
      })}

      <ClosingCta />
    </div>
  );
}
