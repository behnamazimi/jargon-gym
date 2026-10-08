"use client";

import { BookOpen, Layers, Sparkles, Zap } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { setCollectionLove, toggleActiveForReview } from "@/app/(private)/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ownerNoticeFor } from "@/lib/collections/moderation";
import { cn } from "@/lib/utils";
import { rememberLibraryCollection } from "@/lib/library/pick-collection";
import type { Collection } from "@/lib/terms/types";
import { CollectionActionsMenu, CollectionMeta } from "./collection-actions-menu";
import { LoveButton } from "./love-button";
import { AddTermsMenu } from "@/components/import/add-terms-menu";

type LibraryCollectionHeaderProps = {
  collection: Collection;
  categoryCount: number;
  isOwner?: boolean;
  /** Terms not yet known or marked known — Triage only shows while > 0. */
  untriagedCount: number;
};

const STUDY_LINKS = [
  { path: "/app/read", label: "Read", icon: Zap },
  { path: "/app/review", label: "Review", icon: BookOpen },
  { path: "/app/quiz", label: "Quiz", icon: Sparkles },
] as const;

/** Only while the collection still has terms that aren't known or marked known. */
const TRIAGE_LINK = {
  path: "/app/triage",
  label: "Triage",
  icon: Layers,
} as const;

function StudyLinkButton({
  link,
  collectionId,
  className,
}: {
  link: { path: string; label: string; icon: typeof Zap };
  collectionId: string;
  className?: string;
}) {
  const Icon = link.icon;
  return (
    <LinkButton
      href={`${link.path}?collection=${collectionId}`}
      variant={link.path === "/app/read" ? "default" : "outline"}
      size="sm"
      className={cn("min-h-11 gap-2 md:min-h-8", className)}
    >
      <Icon className="size-4" aria-hidden strokeWidth={1.5} />
      {link.label}
    </LinkButton>
  );
}

/** Read, Review and Quiz ignore a paused collection and fall back to "All", so
 *  a paused one offers Resume instead of links that wouldn't be scoped. Triage
 *  works on any collection, paused or not, so it stays. */
function CollectionStudyActions({
  collection,
  showTriage,
  resumePending,
  onResume,
}: {
  collection: Collection;
  showTriage: boolean;
  resumePending: boolean;
  onResume: () => void;
}) {
  if (!collection.isActiveForReview) {
    return (
      <div className="flex flex-col gap-2 rounded-field bg-base-200/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-sm text-base-content/70">
          Paused: left out of Read, Review and Quiz.
        </p>
        <div className="flex shrink-0 gap-2">
          {showTriage ? (
            <StudyLinkButton
              link={TRIAGE_LINK}
              collectionId={collection.id}
              className="flex-1 sm:flex-none"
            />
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 flex-1 sm:flex-none md:min-h-8"
            isDisabled={resumePending}
            onPress={onResume}
          >
            {resumePending ? "Resuming…" : "Resume"}
          </Button>
        </div>
      </div>
    );
  }

  if (collection.termCount === 0) return null;

  const links = showTriage ? [...STUDY_LINKS, TRIAGE_LINK] : STUDY_LINKS;

  return (
    <nav
      aria-label={`Study ${collection.name}`}
      className={cn("grid gap-2 sm:flex", showTriage ? "grid-cols-2" : "grid-cols-3")}
    >
      {links.map((link) => (
        <StudyLinkButton key={link.path} link={link} collectionId={collection.id} />
      ))}
    </nav>
  );
}

export function LibraryCollectionHeader({
  collection: serverCollection,
  categoryCount,
  isOwner = false,
  untriagedCount,
}: LibraryCollectionHeaderProps) {
  const { toast } = useToast();
  // Shows the new state at once; the action re-renders the page with the
  // saved value, and a failed save falls back to it on its own.
  const [isActiveForReview, setOptimisticActive] = useOptimistic(
    serverCollection.isActiveForReview,
  );
  const [togglePending, startToggle] = useTransition();
  const [loveOverride, setLoveOverride] = useState<{
    id: string;
    loved: boolean;
    count: number;
  } | null>(null);
  const love = loveOverride?.id === serverCollection.id ? loveOverride : null;
  const collection = {
    ...serverCollection,
    isActiveForReview,
    lovedByMe: love?.loved ?? serverCollection.lovedByMe,
    loveCount: love?.count ?? serverCollection.loveCount,
  };

  async function toggleLove() {
    const previous = {
      id: collection.id,
      loved: collection.lovedByMe,
      count: collection.loveCount,
    };
    const loved = !previous.loved;
    setLoveOverride({
      id: collection.id,
      loved,
      count: Math.max(0, previous.count + (loved ? 1 : -1)),
    });
    const result = await setCollectionLove(collection.id, loved);
    if (result.error) {
      setLoveOverride(previous);
      toast(result.error, "destructive");
    } else if (result.count !== undefined) {
      setLoveOverride({ id: collection.id, loved, count: result.count });
    }
  }

  function setActiveForReview(active: boolean) {
    // A plain /app/library visit shows the first active collection without
    // remembering it, so pausing that one would move on to the next. Pin it.
    rememberLibraryCollection(collection.id);
    startToggle(async () => {
      setOptimisticActive(active);
      const { error } = await toggleActiveForReview(collection.id, active);
      if (error) toast(error, "destructive");
    });
  }

  return (
    <header className="shadow-surface space-y-4 rounded-box bg-base-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-heading line-clamp-2 text-xl font-medium">
            {collection.icon ? `${collection.icon} ` : ""}
            {collection.name}
          </h1>
          {collection.termCount > 0 ? (
            <p className="text-sm tabular-nums text-base-content/70">
              {collection.termsLearnedCount} of {collection.termCount} mastered or known
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {collection.source === "added" ? (
            <LoveButton
              loved={collection.lovedByMe}
              count={collection.loveCount}
              onToggle={toggleLove}
            />
          ) : null}
          {isOwner ? <AddTermsMenu collectionId={collection.id} /> : null}
          <CollectionActionsMenu
            collection={collection}
            togglePending={togglePending}
            onToggleActiveForReview={() => setActiveForReview(!collection.isActiveForReview)}
          />
        </div>
      </div>

      {collection.source === "owned" && collection.shareBlockedReason ? (
        <Alert variant="info">
          <AlertDescription>{ownerNoticeFor(collection.shareBlockedReason)}</AlertDescription>
        </Alert>
      ) : null}

      <CollectionMeta collection={collection} categoryCount={categoryCount} />

      <CollectionStudyActions
        collection={collection}
        showTriage={untriagedCount > 0}
        resumePending={togglePending}
        onResume={() => setActiveForReview(true)}
      />
    </header>
  );
}
