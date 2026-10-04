import type { ReactNode } from "react";
import { pageContainerClass } from "@/components/page-container";
import { ClosingCta } from "@/components/public/closing-cta";
import { SplitWithScene } from "@/components/public/split-with-scene";
import { cn } from "@/lib/utils";

type ShowcasePageProps = {
  title: string;
  lead: string;
  scene: ReactNode;
  children: ReactNode;
};

export function ShowcasePage({ title, lead, scene, children }: ShowcasePageProps) {
  return (
    <div className={cn(pageContainerClass, "landing-enter flex-1 py-10 pb-24 sm:py-16 lg:py-20")}>
      <SplitWithScene scene={scene}>
        <h1 className="m-0 max-w-[16ch] text-balance text-[clamp(2.5rem,4vw+1rem,4rem)] font-medium leading-[1.05] tracking-tight">
          {title}
        </h1>
        <p className="mt-6 m-0 max-w-[44ch] text-lg leading-relaxed text-base-content/85">{lead}</p>
      </SplitWithScene>

      <article className="mt-16 max-w-[62ch] sm:mt-24">{children}</article>

      <ClosingCta />
    </div>
  );
}
