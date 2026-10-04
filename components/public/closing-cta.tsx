import type { ReactNode } from "react";
import { InviteScene } from "@/components/illustrations/scenes/invite";
import { PublicCta } from "./public-cta";
import { SplitWithScene } from "./split-with-scene";

type ClosingCtaProps = {
  title?: ReactNode;
  body?: ReactNode;
  scene?: ReactNode;
};

export function ClosingCta({
  title = (
    <>
      <span className="text-primary-text">Free.</span> Invite-only.
    </>
  ),
  body = "Read, review and quiz the terms you need, with no due dates to fall behind on.",
  scene = <InviteScene />,
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
          <PublicCta />
        </div>
      </SplitWithScene>
    </section>
  );
}
