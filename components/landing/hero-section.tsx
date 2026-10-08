import { ReadReviewQuizScene } from "@/components/illustrations/scenes/read-review-quiz";
import { LandingCtas } from "./landing-ctas";

export function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="landing-enter grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-20">
      <div className="lg:pt-6">
        {isLoggedIn ? null : (
          <p className="m-0 text-sm text-base-content/70">
            Free to start, with monthly AI credits. Sign-up is by invite.
          </p>
        )}

        <h1 className="mt-4 m-0 max-w-[14ch] text-balance text-[clamp(2.5rem,5vw+1rem,4.75rem)] font-medium leading-[1.04] tracking-tight [overflow-wrap:anywhere]">
          Stop nodding along to terms you don&apos;t{" "}
          <span className="underline decoration-primary decoration-[3px] underline-offset-[0.18em]">
            actually know.
          </span>
        </h1>

        <p className="mt-6 m-0 max-w-[40ch] text-lg leading-relaxed text-base-content/85">
          Every field has shorthand insiders never explain, and every language has words you only
          half know. Lobyas explains them, then helps them stick with light, regular practice.
        </p>

        <div className="mt-8">
          <LandingCtas isLoggedIn={isLoggedIn} />
        </div>
      </div>

      <ReadReviewQuizScene className="mx-auto max-w-md lg:max-w-none" />
    </div>
  );
}
