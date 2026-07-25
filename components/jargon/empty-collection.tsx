import Link from "next/link";

export function EmptyCollection() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-background px-4 py-12 text-foreground">
      <div className="text-center">
        <h1 className="m-0 text-[22px] font-bold tracking-tight">
          <span className="text-accent">Your collection</span> is empty
        </h1>
        <p className="mt-2 max-w-md text-[13px] text-muted">
          Import your own jargon as JSON, or browse shared domains from other users and add them to
          your collection.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/jargon/import"
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white"
        >
          Import jargon
        </Link>
        <Link
          href="/jargon/browse"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-medium shadow-sm"
        >
          Browse shared domains
        </Link>
      </div>
    </div>
  );
}
