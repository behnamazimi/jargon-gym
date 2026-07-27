import { ArrowRight } from "lucide-react";
import { pageContainerClass } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INVITE_REQUEST_EMAIL = "bhnmzm@gmail.com";
const INVITE_REQUEST_MAILTO = `mailto:${INVITE_REQUEST_EMAIL}?subject=${encodeURIComponent("Jargon Gym invitation request")}&body=${encodeURIComponent("Hi,\n\nI'd like to try Jargon Gym. Could you send me an invitation code so I can sign up?\n\nThanks")}`;

export function LandingPage() {
  return (
    <section className="relative flex flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/0.12,transparent_60%)]" />
      </div>
      <div
        className={cn(
          pageContainerClass,
          "relative flex flex-1 flex-col justify-center py-16 sm:py-24 lg:py-28",
        )}
      >
        <div className="landing-enter mx-auto w-full max-w-2xl">
          <Badge variant="outline" className="badge-sm font-medium tracking-wide uppercase">
            Invite only
          </Badge>

          <h1 className="mt-5 m-0 max-w-[20ch] text-balance sm:text-5xl sm:leading-[1.12]">
            A private place to learn industry terms.
          </h1>

          <p className="mt-5 m-0 max-w-[48ch] text-lg leading-relaxed text-base-content/85">
            Jargon Gym isn&apos;t public — you&apos;re here because someone shared this link with
            you. Import term lists, mark what you know, review with flashcards, and quiz yourself
            when you want a check-in.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <LinkButton
              href="/login"
              size="lg"
              className="group gap-2 ps-5 pe-4 transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              Log in
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </LinkButton>
          </div>

          <div className="mt-4 max-w-[48ch] rounded-2xl bg-base-100 px-4 py-3.5 ring-1 ring-base-content/5">
            <p className="m-0 text-sm leading-relaxed text-base-content/80">
              You need an invitation code to sign up.{" "}
              <a href={INVITE_REQUEST_MAILTO} className="underline underline-offset-2">
                Email us to request one
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
