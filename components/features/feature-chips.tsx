import { SectionHeading } from "@/components/public/section-heading";
import type { FeatureSection } from "@/lib/features/sections";
import { FeatureNumber } from "./feature-number";

type ChipsSection = Extract<FeatureSection, { layout: "chips" }>;

export function FeatureChips({ section, number }: { section: ChipsSection; number: number }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className="mt-20 scroll-mt-24 rounded-box bg-base-200 p-6 sm:mt-28 sm:p-10"
    >
      <FeatureNumber value={number} />
      <SectionHeading id={`${section.id}-title`}>{section.title}</SectionHeading>
      <ul className="mt-6 m-0 flex list-none flex-wrap gap-2 p-0">
        {section.items.map((item) => (
          <li key={item} className="badge badge-lg border-base-300 bg-base-100">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
