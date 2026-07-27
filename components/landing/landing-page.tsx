import { ArrowRight } from "lucide-react";
import { pageContainerClass } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <section className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-transparent to-transparent"
      />
      <div
        className={cn(
          pageContainerClass,
          "relative flex flex-1 flex-col justify-center py-16 sm:py-24 lg:py-28",
        )}
      >
        <div className="landing-enter mx-auto w-full max-w-2xl">
          <Badge variant="outline" className="font-medium tracking-wide uppercase">
            Personal use only
          </Badge>

          <h1 className="mt-5 m-0 max-w-[18ch] text-balance">Review jargon at your own pace.</h1>

          <p className="mt-5 m-0 max-w-[52ch] text-lg leading-relaxed text-base-content/85">
            Jargon Gym is a small web app that helps you learn and review industry terms. Import
            your own lists, mark what you know, and come back whenever you need a refresher.
          </p>

          <p className="mt-4 m-0 max-w-[52ch] text-sm leading-relaxed text-base-content/60">
            This is a personal tool — not a product or a service for others. If you have an account,
            log in to pick up where you left off.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <LinkButton
              href="/login"
              size="lg"
              className="group ps-5 pe-4 transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              Log in
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}
