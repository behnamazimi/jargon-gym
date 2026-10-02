import { pageContainerClass } from "@/components/page-container";
import { getSessionUser } from "@/lib/auth/require-session";
import { cn } from "@/lib/utils";
import { AiSection } from "./ai-section";
import { BringYourOwnSection } from "./bring-your-own-section";
import { FinalCtaSection } from "./final-cta-section";
import { HeroSection } from "./hero-section";
import { NotSrsSection } from "./not-srs-section";
import { PlatformsSection } from "./platforms-section";
import { ThreeWaysSection } from "./three-ways-section";

export async function LandingPage() {
  const { user } = await getSessionUser();
  const isLoggedIn = Boolean(user);

  return (
    <section className="flex flex-1 flex-col overflow-x-clip">
      <div className={cn(pageContainerClass, "flex flex-1 flex-col py-10 sm:py-16 lg:py-24")}>
        <HeroSection isLoggedIn={isLoggedIn} />

        <div className="mt-20 space-y-16 sm:mt-28 sm:space-y-24">
          <ThreeWaysSection />
          <NotSrsSection />
          <AiSection />
          <BringYourOwnSection />
          <PlatformsSection />
          <FinalCtaSection isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </section>
  );
}
