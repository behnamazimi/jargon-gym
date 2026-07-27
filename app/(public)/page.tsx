import { ArrowRight } from "lucide-react";
import { pageContainerClass } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section
        className={cn(pageContainerClass, "flex flex-1 flex-col justify-center py-16 sm:py-24")}
      >
        <p className="m-0 text-[13px] font-medium uppercase tracking-[0.12em] text-primary">
          Personal use only
        </p>

        <h1 className="mt-4 m-0 text-[clamp(2rem,5vw,2.75rem)] font-bold leading-[1.1] tracking-tight">
          Review jargon at your own pace.
        </h1>

        <p className="mt-5 m-0 max-w-[52ch] text-[17px] leading-relaxed">
          Jargon Gym is a small web app that helps you learn and review industry terms. Import your
          own lists, mark what you know, and come back whenever you need a refresher.
        </p>

        <p className="mt-4 m-0 max-w-[52ch] text-[15px] leading-relaxed text-base-content/60">
          This is a personal tool — not a product or a service for others. If you have an account,
          log in to pick up where you left off.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <LinkButton href="/login" size="lg" className="rounded-xl px-5 py-2.5 text-[14px]">
            Log in
            <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
