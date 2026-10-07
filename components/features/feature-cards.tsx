import {
  BookOpen,
  Bug,
  Download,
  Monitor,
  Pencil,
  Send,
  ShieldCheck,
  Smartphone,
  Star,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/public/section-heading";
import type { FeatureIconKey, FeatureSection } from "@/lib/features/sections";
import { FeatureNumber } from "./feature-number";

type CardsSection = Extract<FeatureSection, { layout: "cards" }>;

const ICONS: Record<FeatureIconKey, LucideIcon> = {
  book: BookOpen,
  pencil: Pencil,
  download: Download,
  phone: Smartphone,
  send: Send,
  monitor: Monitor,
  star: Star,
  shield: ShieldCheck,
  bug: Bug,
};

export function FeatureCards({ section, number }: { section: CardsSection; number: number }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className="mt-20 scroll-mt-24 sm:mt-28"
    >
      <FeatureNumber value={number} />
      <SectionHeading id={`${section.id}-title`}>{section.title}</SectionHeading>
      <p className="mt-3 m-0 text-lg leading-relaxed text-base-content/85">{section.lead}</p>
      <ul className="mt-8 m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
        {section.items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.title} className="card bg-base-200">
              <div className="card-body gap-2 p-5">
                <span className="flex size-10 items-center justify-center rounded-box border border-base-300 bg-base-100">
                  <Icon className="size-5 text-primary-text" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="m-0 mt-1 font-sans text-base font-semibold">{item.title}</h3>
                <p className="m-0 text-sm leading-relaxed text-base-content/70">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
