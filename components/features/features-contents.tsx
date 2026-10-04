import type { FeatureSection } from "@/lib/features/sections";

export function FeaturesContents({ sections }: { sections: FeatureSection[] }) {
  return (
    <nav aria-label="Sections" className="mt-12 sm:mt-16">
      <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-2 sm:flex-wrap sm:overflow-visible">
        {sections.map((section, index) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              className="btn btn-sm btn-ghost rounded-full border-base-300 bg-base-200 font-normal"
            >
              <span className="font-mono text-primary-text">
                {String(index + 1).padStart(2, "0")}
              </span>
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
