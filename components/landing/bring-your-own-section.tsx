import { FolderPlus } from "lucide-react";
import Link from "next/link";
import { contentPageLinkClass } from "@/components/content/content-page-shell";

export function BringYourOwnSection() {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary">
        <FolderPlus aria-hidden className="size-6" strokeWidth={1.75} />
      </div>
      <div>
        <h2 className="m-0 text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
          Bring{" "}
          <span className="underline decoration-primary decoration-2 underline-offset-4">
            your own
          </span>{" "}
          collection
        </h2>
        <p className="mt-3 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
          Build a collection for whatever jargon you&apos;re learning, a new job, a technical field,
          your team&apos;s acronyms. Collections you create are private by default.{" "}
          <Link href="/j" className={contentPageLinkClass}>
            Or start from a public one
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
