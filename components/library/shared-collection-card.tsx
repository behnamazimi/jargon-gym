"use client";

import { YELLOW } from "@/components/illustrations/palette";
import { LobyaHead } from "@/components/illustrations/scenes/goal-team";
import { ArrowRight, BookmarkMinus, CheckCircle2, Ellipsis, Flag, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { REPORTED_THANKS } from "@/lib/collections/moderation";
import { LoveButton } from "./love-button";
import type { SharedCollection } from "@/lib/terms/types";
import { cn, pluralize } from "@/lib/utils";
import { NAV_FORWARD } from "@/components/shared/view-transitions";

type SharedCollectionCardProps = {
  collection: SharedCollection;
  busy: boolean;
  /** Added from this page a moment ago: offers what to do next. */
  justAdded?: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onToggleLove: () => void;
  onReport: () => void;
};

/** A stable number per collection, so each one keeps its own lobya. */
function seedFor(id: string) {
  let seed = 0;
  for (const char of id) seed = (seed * 31 + char.charCodeAt(0)) % 997;
  return seed;
}

export function SharedCollectionCard({
  collection,
  busy,
  justAdded = false,
  onAdd,
  onRemove,
  onToggleLove,
  onReport,
}: SharedCollectionCardProps) {
  return (
    <article
      className={cn(
        "shadow-surface flex flex-col gap-4 rounded-box bg-base-100 p-5 transition-shadow duration-150",
        "hover:shadow-surface-hover",
        collection.inCollection &&
          "bg-[color-mix(in_oklab,var(--color-primary)_5%,var(--color-base-100))]",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-field bg-primary/10 text-xl leading-none"
            aria-hidden
          >
            {collection.icon || (
              <LobyaHead color={YELLOW} seed={seedFor(collection.id)} className="size-7" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="font-heading truncate text-base font-medium">{collection.name}</h2>
            {collection.description ? (
              <p className="line-clamp-2 text-sm text-base-content/70">{collection.description}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm tabular-nums text-base-content/70">
                {pluralize(collection.termCount, "term")}
              </p>
              {collection.inCollection ? (
                <Badge className="badge-soft badge-primary gap-1 border-0">
                  <CheckCircle2 className="size-3" aria-hidden strokeWidth={1.5} />
                  In library
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-base-content/10 pt-3 md:border-0 md:pt-0 md:ps-2">
          <LoveButton
            loved={collection.lovedByMe}
            count={collection.loveCount}
            onToggle={onToggleLove}
          />
          <div className="ms-auto flex items-center gap-1">
            {collection.inCollection ? (
              <LinkButton
                href={`/app/library?collection=${collection.id}`}
                variant="ghost"
                className="min-h-11 gap-2 md:min-h-8"
              >
                View in library
                <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
              </LinkButton>
            ) : (
              <Button
                type="button"
                data-tour="browse-add"
                onPress={onAdd}
                isDisabled={busy}
                className="min-h-11 gap-2 transition-transform active:scale-[0.96] md:min-h-8"
              >
                <Plus className="size-4" aria-hidden strokeWidth={1.5} />
                Add to library
              </Button>
            )}
            {collection.inCollection || !collection.isBuiltin ? (
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
                  {collection.inCollection ? (
                    <DropdownMenuItem isDisabled={busy} onAction={onRemove}>
                      <BookmarkMinus className="h-4 w-4" />
                      Remove from library
                    </DropdownMenuItem>
                  ) : null}
                  {collection.isBuiltin ? null : (
                    <DropdownMenuItem isDisabled={collection.reportedByMe} onAction={onReport}>
                      <Flag className="h-4 w-4" />
                      {collection.reportedByMe ? REPORTED_THANKS : "Report collection"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenu>
              </DropdownMenuTrigger>
            ) : null}
          </div>
        </div>
      </div>
      {justAdded && collection.inCollection ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-field bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="m-0 text-sm font-medium">Added to your library.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <LinkButton
              href={`/app/triage?collection=${collection.id}`}
              transitionTypes={NAV_FORWARD}
              variant="outline"
              size="sm"
              className="min-h-11 md:min-h-8"
            >
              Sort what you know
            </LinkButton>
            <LinkButton
              href={`/app/read?collection=${collection.id}`}
              size="sm"
              className="min-h-11 md:min-h-8"
            >
              Start reading
            </LinkButton>
          </div>
        </div>
      ) : null}
    </article>
  );
}
