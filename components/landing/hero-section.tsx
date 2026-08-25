import { Badge } from "@/components/ui/badge";
import { LandingCtas } from "./landing-ctas";
import { TermCardMockup } from "./term-card-mockup";

export function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="landing-enter grid grid-cols-1 items-center gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16">
      <div>
        <Badge variant="outline" className="badge-sm font-medium tracking-wide">
          Private app, need an invitation
        </Badge>

        <h1 className="mt-5 m-0 max-w-[18ch] text-balance text-[clamp(2.25rem,4.5vw+1rem,3.75rem)] leading-[1.08]">
          Stop nodding along to terms you don&apos;t actually know.
        </h1>

        <p className="mt-5 m-0 max-w-[40ch] text-lg leading-relaxed text-base-content/85">
          Every field has its own shorthand insiders never stop to explain. Jargon Gym decodes it,
          then drills you until it sticks.
        </p>

        <div className="mt-8">
          <LandingCtas isLoggedIn={isLoggedIn} />
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="relative mx-auto w-full max-w-md">
          <div
            aria-hidden
            className="absolute -top-5 -right-4 -z-10 h-full w-[95%] rotate-[3deg] rounded-2xl bg-base-100 shadow-surface ring-1 ring-base-content/5"
          />
          <TermCardMockup />
        </div>
      </div>
    </div>
  );
}
