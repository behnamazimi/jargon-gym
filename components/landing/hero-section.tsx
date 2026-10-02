import { LandingCtas } from "./landing-ctas";
import { TermCardMockup } from "./term-card-mockup";

export function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="landing-enter grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-20">
      <div className="lg:pt-6">
        <p className="m-0 text-sm text-base-content/70">Private app, need an invitation</p>

        <h1 className="mt-4 m-0 max-w-[14ch] text-balance text-[clamp(2.5rem,5vw+1rem,4.75rem)] font-medium leading-[1.04] tracking-tight [overflow-wrap:anywhere]">
          Stop nodding along to terms you don&apos;t{" "}
          <span className="underline decoration-primary decoration-[3px] underline-offset-[0.18em]">
            actually know.
          </span>
        </h1>

        <p className="mt-6 m-0 max-w-[40ch] text-lg leading-relaxed text-base-content/85">
          Every field has shorthand insiders never explain, and every language has words you only
          half know. Jargon Gym explains them, then drills you until they stick.
        </p>

        <div className="mt-8">
          <LandingCtas isLoggedIn={isLoggedIn} />
        </div>
      </div>

      <figure className="m-0 w-full min-w-0">
        <TermCardMockup />
        <figcaption className="mt-3 text-center text-sm text-base-content/70">
          A real term card from a sample queue. It changes every few seconds.
        </figcaption>
      </figure>
    </div>
  );
}
