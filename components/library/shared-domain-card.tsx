"use client";

import { ArrowRight, BookmarkMinus, CheckCircle2, Ellipsis, Flag, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { REPORTED_THANKS } from "@/lib/collections/moderation";
import { LoveButton } from "./love-button";
import type { SharedDomain } from "@/lib/terms/types";
import { cn, pluralize } from "@/lib/utils";

type SharedDomainCardProps = {
  domain: SharedDomain;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onToggleLove: () => void;
  onReport: () => void;
};

export function SharedDomainCard({
  domain,
  busy,
  onAdd,
  onRemove,
  onToggleLove,
  onReport,
}: SharedDomainCardProps) {
  return (
    <article
      className={cn(
        "shadow-surface flex flex-col gap-4 rounded-box bg-base-100 p-5 transition-shadow duration-150 md:flex-row md:items-center md:justify-between md:gap-6",
        "hover:shadow-surface-hover",
        domain.inCollection && "bg-primary/[0.03]",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-field bg-primary/10 text-xl leading-none"
          aria-hidden
        >
          {domain.icon || "📚"}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading truncate text-base font-medium">{domain.name}</h2>
            {domain.inCollection ? (
              <Badge className="badge-soft badge-primary gap-1 border-0">
                <CheckCircle2 className="size-3" aria-hidden strokeWidth={1.5} />
                In collection
              </Badge>
            ) : null}
          </div>
          {domain.description ? (
            <p className="line-clamp-2 text-sm text-base-content/70">{domain.description}</p>
          ) : null}
          <p className="text-sm tabular-nums text-base-content/70">
            {pluralize(domain.termCount, "term")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-2 md:flex-row md:items-center md:ps-2">
        <div className="flex items-center justify-between gap-1 md:justify-start">
          <LoveButton loved={domain.lovedByMe} count={domain.loveCount} onToggle={onToggleLove} />
          {domain.isBuiltin ? null : (
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 text-base-content/70 hover:text-base-content md:min-h-8 md:min-w-8"
                aria-label="More actions"
              >
                <Ellipsis className="size-5" aria-hidden strokeWidth={1.5} />
              </Button>
              <DropdownMenu className="min-w-[200px]" placement="bottom end">
                <DropdownMenuItem isDisabled={domain.reportedByMe} onAction={onReport}>
                  <Flag className="h-4 w-4" />
                  {domain.reportedByMe ? REPORTED_THANKS : "Report collection"}
                </DropdownMenuItem>
              </DropdownMenu>
            </DropdownMenuTrigger>
          )}
        </div>
        {domain.inCollection ? (
          <>
            <LinkButton
              href={`/app/library?domain=${domain.id}`}
              variant="ghost"
              className="w-full min-h-11 gap-2 md:w-auto"
            >
              View in collection
              <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
            </LinkButton>
            <Button
              type="button"
              variant="outline"
              onPress={onRemove}
              isDisabled={busy}
              className="w-full min-h-11 gap-2 transition-transform active:scale-[0.96] md:w-auto"
            >
              <BookmarkMinus className="size-4" aria-hidden strokeWidth={1.5} />
              Remove
            </Button>
          </>
        ) : (
          <Button
            type="button"
            data-tour="browse-add"
            onPress={onAdd}
            isDisabled={busy}
            className="w-full min-h-11 gap-2 transition-transform active:scale-[0.96] md:w-auto"
          >
            <Plus className="size-4" aria-hidden strokeWidth={1.5} />
            Add to collection
          </Button>
        )}
      </div>
    </article>
  );
}
