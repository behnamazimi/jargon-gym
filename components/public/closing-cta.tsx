import type { ComponentProps, ReactNode } from "react";
import { InviteScene } from "@/components/illustrations/scenes/invite";
import { PublicCta } from "./public-cta";
import { SplitWithScene } from "./split-with-scene";

type ClosingCtaProps = {
  title?: ReactNode;
  body?: ReactNode;
  scene?: ReactNode;
  /** On a collection's page, signed-in visitors can add it straight from here. */
  collection?: ComponentProps<typeof PublicCta>["collection"];
};

export function ClosingCta({
  title = (
    <>
      <span className="text-primary-text">Free to start.</span> At your own pace.
    </>
  ),
  body = "Free to start: you get AI credits when you join and a refill every month. Read, Review and simple quizzes never use credits, and there are no due dates to fall behind on.",
  scene = <InviteScene />,
  collection,
}: ClosingCtaProps) {
  return (
    <section className="mt-20 border-t-2 border-base-content/80 pt-10 sm:mt-28 sm:pt-14">
      <SplitWithScene scene={scene} sceneFirstOnPhone>
        <h2 className="m-0 text-balance text-5xl font-medium tracking-tight sm:text-6xl">
          {title}
        </h2>
        <p className="mt-4 m-0 max-w-[52ch] text-base leading-relaxed text-base-content/85">
          {body}
        </p>
        <div className="mt-6">
          <PublicCta collection={collection} />
        </div>
      </SplitWithScene>
    </section>
  );
}
