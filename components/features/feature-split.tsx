import { SectionHeading } from "@/components/public/section-heading";
import type { FeatureSection } from "@/lib/features/sections";
import { cn } from "@/lib/utils";
import { FeatureNumber } from "./feature-number";
import { FEATURE_SCENES } from "./scenes";

type SplitSection = Extract<FeatureSection, { layout: "split" }>;

export function FeatureSplit({
  section,
  number,
  flipped,
}: {
  section: SplitSection;
  number: number;
  flipped: boolean;
}) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className={cn(
        "mt-20 grid scroll-mt-24 grid-cols-1 items-center gap-10 sm:mt-28 lg:gap-20",
        flipped
          ? "lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]"
          : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]",
      )}
    >
      <div className={cn("min-w-0", flipped && "lg:order-2")}>
        <FeatureNumber value={number} />
        <SectionHeading id={`${section.id}-title`} className="sm:text-4xl">
          {section.title}
        </SectionHeading>
        <p className="mt-3 m-0 max-w-[46ch] text-lg leading-relaxed text-base-content/85">
          {section.lead}
        </p>
        <ul className="mt-8 m-0 grid list-none gap-x-8 gap-y-5 p-0 sm:grid-cols-2">
          {section.items.map((item) => (
            <li key={item.title} className="border-t border-base-300 pt-3">
              <h3 className="m-0 font-sans text-base font-semibold">{item.title}</h3>
              <p className="mt-1 m-0 text-sm leading-relaxed text-base-content/70">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-xs min-w-0 sm:max-w-sm lg:max-w-none">
        {FEATURE_SCENES[section.scene]}
      </div>
    </section>
  );
}
