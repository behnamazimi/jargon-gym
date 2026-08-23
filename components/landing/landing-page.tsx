import { pageContainerClass } from "@/components/page-container";
import { getSessionUser } from "@/lib/auth/require-session";
import { cn } from "@/lib/utils";
import { BringYourOwnSection } from "./bring-your-own-section";
import { FinalCtaSection } from "./final-cta-section";
import { HeroSection } from "./hero-section";
import { NotSrsSection } from "./not-srs-section";
import { PlatformsSection } from "./platforms-section";
import { SmartQueueSection } from "./smart-queue-section";
import { ThreeWaysSection } from "./three-ways-section";

export async function LandingPage() {
  const { user } = await getSessionUser();
  const isLoggedIn = Boolean(user);

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/0.16,transparent_60%)]" />
      </div>
      <div
        className={cn(
          pageContainerClass,
          "relative flex flex-1 flex-col justify-start py-8 sm:py-16 lg:py-20",
        )}
      >
        <HeroSection isLoggedIn={isLoggedIn} />

        <div className="mt-16 space-y-14 sm:mt-24 sm:space-y-20">
          <ThreeWaysSection />
          <NotSrsSection />
          <SmartQueueSection />
          <BringYourOwnSection />
          <PlatformsSection />
          <FinalCtaSection isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </section>
  );
}
