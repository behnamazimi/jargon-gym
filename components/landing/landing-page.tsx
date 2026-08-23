import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { contentPageLinkClass } from "@/components/content/content-page-shell";
import { pageContainerClass } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/require-session";
import { cn } from "@/lib/utils";

function LandingCtas({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <LinkButton
          href="/jargon"
          size="lg"
          className="group min-h-12 gap-2 ps-5 pe-4 transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          See your collection
          <ArrowRight
            aria-hidden
            className="size-4 shrink-0 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="max-w-[48ch]">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <LinkButton
          href="/request-access"
          size="lg"
          className="group min-h-12 w-full gap-2 ps-5 pe-4 transition-transform duration-150 ease-out active:scale-[0.96] sm:w-auto"
        >
          Request access
          <ArrowRight
            aria-hidden
            className="size-4 shrink-0 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </LinkButton>
        <LinkButton
          href="/login"
          variant="ghost"
          size="lg"
          className="min-h-12 w-full transition-transform duration-150 ease-out active:scale-[0.96] sm:w-auto"
        >
          Log in
        </LinkButton>
      </div>
      <p className="mt-3 m-0 text-sm leading-relaxed text-base-content/70">
        You need an invitation code to sign up.
      </p>
    </div>
  );
}

export async function LandingPage() {
  const { user } = await getSessionUser();
  const isLoggedIn = Boolean(user);

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/0.12,transparent_60%)]" />
      </div>
      <div
        className={cn(
          pageContainerClass,
          "relative flex flex-1 flex-col justify-start py-8 sm:py-16 lg:py-20",
        )}
      >
        <div className="landing-enter mx-auto w-full max-w-2xl">
          <Badge variant="outline" className="badge-sm font-medium tracking-wide">
            Private app, need an invitation
          </Badge>

          <h1 className="mt-5 m-0 max-w-[22ch] text-balance sm:text-5xl sm:leading-[1.12]">
            Jargon you can actually use
          </h1>

          <p className="mt-5 m-0 max-w-[48ch] text-lg leading-relaxed text-base-content/85">
            I built this for myself after years of picking up jargon I couldn&apos;t actually use.
            Import term lists, mark what you know, review when you feel like it, quiz when you want
            a check-in. It&apos;s invite-only, you&apos;re here because someone shared this link
            with you.
          </p>

          <div className="mt-8">
            <LandingCtas isLoggedIn={isLoggedIn} />
          </div>

          <div className="mt-10">
            <div className="space-y-3 text-base leading-relaxed text-base-content/85">
              <h2 className="m-0 text-sm font-semibold tracking-tight text-base-content">
                What&apos;s in it
              </h2>
              <ul className="m-0 max-w-[48ch] list-disc space-y-2 ps-5 text-base-content/80">
                <li>
                  Add your own collection, or start with a{" "}
                  <Link href="/j" className={contentPageLinkClass}>
                    public one
                  </Link>
                  , agentic development, software engineering, standup jargon, and more, browsable
                  with no account
                </li>
                <li>
                  Terms with more than a definition, example, how it&apos;s used, where people
                  disagree. See{" "}
                  <Link href="/how-terms-work" className={contentPageLinkClass}>
                    how terms are built
                  </Link>
                </li>
                <li>
                  A review queue that ranks what you&apos;ve neglected or still can&apos;t use, no
                  due dates. See{" "}
                  <Link href="/how-smart-queue-works" className={contentPageLinkClass}>
                    how that works
                  </Link>
                </li>
                <li>Quizzes when you want a real check, not a daily streak to protect</li>
                <li>
                  Terms show up where you already are, in this web app, in a Telegram bot, and on
                  your desktop in a widget. Same ranking everywhere.
                </li>
              </ul>
            </div>

            <p className="mt-6 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              When reviewing, the queue shows what&apos;s been neglected or stayed shaky, from your
              history, not a schedule. I go through a ranked batch, mark what I know, and come back
              when I feel like it.
            </p>

            <p className="mt-4 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              Known and unknown stay in separate pools so I&apos;m not wasting time on words I
              already have.
            </p>

            <p className="mt-4 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              I tried Anki and other due-based review tools and kept falling off.
            </p>
            <blockquote className="mt-4 m-0 max-w-[48ch] border-s-2 border-base-content/25 ps-4 text-base leading-relaxed text-base-content">
              Overdue cards pile up, the daily guilt kicks in, and none of it fit how I actually
              wanted to learn.
            </blockquote>
            <p className="mt-4 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              So no due dates, no reset button. And not a glossary either, terms here are built to
              be used, not just looked up.
            </p>

            <div className="mt-8">
              <LandingCtas isLoggedIn={isLoggedIn} />
            </div>

            <p className="mt-6 m-0 max-w-[48ch] text-sm leading-relaxed text-base-content/70">
              If you want to know more before signing up:{" "}
              <Link href="/before-you-sign-up" className={contentPageLinkClass}>
                Before you sign up
              </Link>
              ,{" "}
              <Link href="/how-terms-work" className={contentPageLinkClass}>
                how terms are built
              </Link>
              , and{" "}
              <Link href="/how-smart-queue-works" className={contentPageLinkClass}>
                how the Smart Queue works
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
