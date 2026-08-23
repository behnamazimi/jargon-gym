import {
  ArrowRight,
  BookOpen,
  Globe,
  Monitor,
  Send,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
        Invite-only — request access, or use the code you were given.
      </p>
    </div>
  );
}

function IconRow({ items }: { items: { icon: LucideIcon; label: string; body: string }[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {items.map(({ icon: Icon, label, body }) => (
        <div key={label} className="flex flex-col gap-2">
          <Icon aria-hidden className="size-5 text-primary" strokeWidth={1.75} />
          <p className="m-0 text-sm font-semibold text-base-content">{label}</p>
          <p className="m-0 text-sm leading-relaxed text-base-content/75">{body}</p>
        </div>
      ))}
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
            The terms your field expects you to already know.
          </h1>

          <p className="mt-5 m-0 max-w-[48ch] text-lg leading-relaxed text-base-content/85">
            The technical terms, acronyms, and insider language of any industry or job, no due
            dates, no streaks to protect.
          </p>

          <div className="mt-8">
            <LandingCtas isLoggedIn={isLoggedIn} />
          </div>

          <div className="mt-14 sm:mt-20">
            <h2 className="m-0 text-sm font-semibold tracking-tight text-base-content">
              Three ways in, no required order
            </h2>
            <p className="mt-2 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              Read a term, review it, quiz yourself. Most people read first, then review and quiz to
              lock it in, but nothing forces an order.
            </p>
            <div className="mt-6">
              <IconRow
                items={[
                  {
                    icon: Zap,
                    label: "Read",
                    body: "See a term with real usage, not just a definition.",
                  },
                  {
                    icon: BookOpen,
                    label: "Review",
                    body: "Confirm what you know. Neglected and shaky terms surface first.",
                  },
                  {
                    icon: Sparkles,
                    label: "Quiz",
                    body: "A real check on known terms, no daily streak to babysit.",
                  },
                ]}
              />
            </div>
          </div>

          <div className="mt-14 sm:mt-20">
            <h2 className="m-0 text-sm font-semibold tracking-tight text-base-content">
              This isn&apos;t spaced repetition
            </h2>
            <p className="mt-2 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              Anki and other SRS tools schedule what you see by date. Cards pile up, the daily guilt
              kicks in, and the schedule stops matching how you actually want to learn. Jargon Gym
              has no due dates and no reset button, come back whenever, nothing&apos;s overdue.
            </p>
          </div>

          <div className="mt-14 sm:mt-20">
            <h2 className="m-0 text-sm font-semibold tracking-tight text-base-content">
              The Smart Queue
            </h2>
            <p className="mt-2 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              It always shows you the term you&apos;re weakest on, never just the one that happens
              to be due today.{" "}
              <Link href="/how-smart-queue-works" className={contentPageLinkClass}>
                See how it ranks terms
              </Link>
              .
            </p>
          </div>

          <div className="mt-14 sm:mt-20">
            <h2 className="m-0 text-sm font-semibold tracking-tight text-base-content">
              Bring your own collection
            </h2>
            <p className="mt-2 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              Build a collection for whatever jargon you&apos;re learning, a new job, a technical
              field, your team&apos;s acronyms. Collections you create are private by default.{" "}
              <Link href="/j" className={contentPageLinkClass}>
                Or start from a public one
              </Link>
              .
            </p>
          </div>

          <div className="mt-14 sm:mt-20">
            <h2 className="m-0 text-sm font-semibold tracking-tight text-base-content">
              Same queue, everywhere
            </h2>
            <p className="mt-2 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              Install it on your phone, glance at a macOS widget, or run it through Telegram,
              it&apos;s the same ranked queue wherever you open it.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                { icon: Globe, label: "Web" },
                { icon: Smartphone, label: "Mobile" },
                { icon: Monitor, label: "macOS widget" },
                { icon: Send, label: "Telegram" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-base-content/80">
                  <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 sm:mt-20">
            <h2 className="m-0 text-sm font-semibold tracking-tight text-base-content">
              Free. Invite-only.
            </h2>
            <p className="mt-2 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
              Request access, or use the code someone gave you.
            </p>
            <div className="mt-6">
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
