import Link from "next/link";
import { contentPageLinkClass } from "@/components/content/content-page-shell";

export function BringYourOwnSection() {
  return (
    <div className="max-w-3xl border-s-[3px] border-primary ps-6 sm:ps-8">
      <h2 className="m-0 text-balance text-3xl font-medium tracking-tight sm:text-4xl">
        Bring your own collection
      </h2>
      <p className="mt-4 m-0 max-w-[52ch] text-base leading-relaxed text-base-content/85">
        Build a collection for whatever you&apos;re learning: a new job&apos;s jargon, a technical
        field, your team&apos;s acronyms, or a language&apos;s vocabulary. Collections you create
        are private by default.{" "}
        <Link href="/j" className={contentPageLinkClass}>
          Or start from a public one
        </Link>
        .
      </p>
    </div>
  );
}
