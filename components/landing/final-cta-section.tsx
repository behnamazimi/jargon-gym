import Link from "next/link";
import { contentPageLinkClass } from "@/components/content/content-page-shell";
import { LandingCtas } from "./landing-ctas";

export function FinalCtaSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/[0.03] p-8 sm:p-12">
      <h2 className="m-0 text-4xl font-bold tracking-tight text-base-content sm:text-5xl">
        <span className="text-primary">Free.</span> Invite-only.
      </h2>
      <p className="mt-3 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
        Request access, or use the code someone gave you.
      </p>
      <div className="mt-6">
        <LandingCtas isLoggedIn={isLoggedIn} />
      </div>
      <p className="mt-6 m-0 max-w-[48ch] text-sm leading-relaxed text-base-content/70">
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
  );
}
