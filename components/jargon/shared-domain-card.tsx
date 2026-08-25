"use client";

import { ArrowRight, BookmarkMinus, CheckCircle2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import type { SharedDomain } from "@/lib/jargon/types";
import { cn, pluralize } from "@/lib/utils";

type SharedDomainCardProps = {
  domain: SharedDomain;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
};

export function SharedDomainCard({ domain, busy, onAdd, onRemove }: SharedDomainCardProps) {
  return (
    <article
      className={cn(
        "shadow-surface flex flex-col gap-4 rounded-2xl bg-base-100 p-4 transition-shadow duration-150 md:flex-row md:items-center md:justify-between md:gap-6",
        "hover:shadow-surface-hover",
        domain.inCollection && "bg-primary/[0.03]",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-base-200/70 text-xl leading-none"
          aria-hidden
        >
          {domain.icon || "📚"}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading truncate text-base font-semibold tracking-tight">
              {domain.name}
            </h2>
            {domain.inCollection ? (
              <Badge className="badge-soft badge-primary gap-1 border-0">
                <CheckCircle2 className="size-3" aria-hidden strokeWidth={1.5} />
                In collection
              </Badge>
            ) : null}
          </div>
          {domain.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-base-content/60">
              {domain.description}
            </p>
          ) : null}
          <p className="text-sm tabular-nums text-base-content/60">
            {pluralize(domain.termCount, "term")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-2 md:flex-row md:items-center md:ps-2">
        {domain.inCollection ? (
          <>
            <LinkButton
              href={`/jargon?domain=${domain.id}`}
              variant="ghost"
              className="w-full min-h-11 gap-1.5 md:w-auto"
            >
              View in collection
              <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
            </LinkButton>
            <Button
              type="button"
              variant="outline"
              onPress={onRemove}
              isDisabled={busy}
              className="w-full min-h-11 gap-1.5 transition-transform active:scale-[0.96] md:w-auto"
            >
              <BookmarkMinus className="size-4" aria-hidden strokeWidth={1.5} />
              {busy ? "Removing…" : "Remove"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onPress={onAdd}
            isDisabled={busy}
            className="w-full min-h-11 gap-1.5 transition-transform active:scale-[0.96] md:w-auto"
          >
            <Plus className="size-4" aria-hidden strokeWidth={1.5} />
            {busy ? "Adding…" : "Add to collection"}
          </Button>
        )}
      </div>
    </article>
  );
}
