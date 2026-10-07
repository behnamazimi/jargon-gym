import Link from "next/link";
import { contentPageLinkClass } from "@/components/content/content-page-shell";
import { InviteScene } from "@/components/illustrations/scenes/invite";
import { LandingCtas } from "./landing-ctas";

export function FinalCtaSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 border-t-2 border-base-content/80 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-20">
      <div>
        <h2 className="m-0 text-balance text-5xl font-medium tracking-tight sm:text-6xl">
          <span className="text-primary-text">Free.</span> At your own pace.
        </h2>
        <p className="mt-4 m-0 max-w-[52ch] text-base leading-relaxed text-base-content/85">
          Free to use, with monthly AI credits. Read, review and quiz the terms you need, with no
          due dates to fall behind on.
        </p>
        <div className="mt-6">
          <LandingCtas isLoggedIn={isLoggedIn} />
        </div>
        <p className="mt-8 m-0 max-w-[52ch] text-sm leading-relaxed text-base-content/70">
          If you want to know more before signing up:{" "}
          <Link href="/before-you-sign-up" className={contentPageLinkClass}>
            Before you sign up
          </Link>{" "}
          and{" "}
          <Link href="/how-terms-work" className={contentPageLinkClass}>
            how terms are built
          </Link>
          .
        </p>
      </div>
      <InviteScene className="order-first mx-auto max-w-xs sm:max-w-sm lg:order-none lg:max-w-none" />
    </div>
  );
}
