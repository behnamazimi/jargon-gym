import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";
import { pageContainerClass } from "@/components/page-container";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className={cn(pageContainerClass, "flex flex-col items-center gap-3 py-5")}>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
        >
          <Link
            href="/before-you-sign-up"
            className="text-xs text-base-content/60 underline underline-offset-2 transition-colors hover:text-base-content"
          >
            Before you sign up
          </Link>
          <Link
            href="/how-terms-work"
            className="text-xs text-base-content/60 underline underline-offset-2 transition-colors hover:text-base-content"
          >
            How terms are built
          </Link>
          <Link
            href="/j"
            className="text-xs text-base-content/60 underline underline-offset-2 transition-colors hover:text-base-content"
          >
            Jargon Collections
          </Link>
        </nav>
        <p className="m-0 flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-base-content/60">
          <BrandIcon size="sm" />
          <span>Jargon Gym — private app, shared by invitation.</span>
        </p>
      </div>
    </footer>
  );
}
