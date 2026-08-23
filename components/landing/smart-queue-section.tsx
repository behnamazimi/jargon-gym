import Link from "next/link";
import { contentPageLinkClass } from "@/components/content/content-page-shell";
import { cn } from "@/lib/utils";

const QUEUE_ROWS = [
  { term: "Burn rate", strength: 22 },
  { term: "Runway", strength: 55 },
  { term: "ARR", strength: 81 },
];

function SmartQueueMockup() {
  return (
    <div
      className="rounded-2xl bg-base-100 p-5 shadow-surface ring-1 ring-base-content/5"
      aria-hidden
    >
      <p className="m-0 text-xs font-semibold tracking-wide text-base-content/50">
        Up next, weakest first
      </p>
      <div className="mt-3 space-y-3">
        {QUEUE_ROWS.map(({ term, strength }, index) => (
          <div key={term} className="flex items-center gap-3">
            <span className="font-mono text-xs text-base-content/30">{index + 1}</span>
            <span className="w-24 shrink-0 truncate text-sm font-medium text-base-content">
              {term}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-300">
              <div
                className={cn(
                  "h-full rounded-full",
                  strength < 40 ? "bg-error/70" : strength < 70 ? "bg-warning/70" : "bg-primary",
                )}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SmartQueueSection() {
  return (
    <div className="grid max-w-4xl grid-cols-1 items-center gap-8 sm:grid-cols-[1.2fr_1fr] sm:gap-10">
      <div>
        <h2 className="m-0 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
          The <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-primary">Smart Queue</span>
        </h2>
        <p className="mt-3 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
          It always shows you the term you&apos;re weakest on, never just the one that happens to be
          due today.{" "}
          <Link href="/how-smart-queue-works" className={contentPageLinkClass}>
            See how it ranks terms
          </Link>
          .
        </p>
      </div>
      <SmartQueueMockup />
    </div>
  );
}
