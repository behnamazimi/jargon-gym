import { ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export function LandingCtas({ isLoggedIn }: { isLoggedIn: boolean }) {
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
