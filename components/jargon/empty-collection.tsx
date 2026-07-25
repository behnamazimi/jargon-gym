import { Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export function EmptyCollection() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 bg-gradient-to-b from-primary/[0.06] via-background to-background px-4 py-12 text-foreground">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-6" aria-hidden />
      </div>
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          <span className="text-primary">Your collection</span> is empty
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Import your own jargon as JSON, or browse shared domains from other users and add them to
          your collection.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <LinkButton href="/jargon/import">Import jargon</LinkButton>
        <LinkButton href="/jargon/browse" variant="outline">
          Browse shared domains
        </LinkButton>
      </div>
    </div>
  );
}
