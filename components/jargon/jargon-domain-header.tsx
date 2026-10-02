"use client";

import { BookOpen, Layers, Sparkles, Zap } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toggleActiveForReview } from "@/app/(private)/jargon/actions";
import { Button, LinkButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Domain } from "@/lib/jargon/types";
import { DomainActionsMenu, DomainMeta } from "./domain-actions-menu";
import { AddTermsMenu } from "./add-terms-menu";

type JargonDomainHeaderProps = {
  domain: Domain;
  categoryCount: number;
  isOwner?: boolean;
  /** Terms not yet known or marked known — Triage only shows while > 0. */
  untriagedCount: number;
  onAddTerm?: () => void;
};

const STUDY_LINKS = [
  { path: "/jargon/read", label: "Read", icon: Zap },
  { path: "/jargon/review", label: "Review", icon: BookOpen },
  { path: "/jargon/quiz", label: "Quiz", icon: Sparkles },
] as const;

/** Only while the collection still has terms that aren't known or marked known. */
const TRIAGE_LINK = { path: "/jargon/triage", label: "Triage", icon: Layers } as const;

/** Study pages ignore a paused collection and fall back to "All", so a
 *  paused one offers Resume instead of links that wouldn't be scoped. */
function CollectionStudyActions({
  domain,
  showTriage,
  resumePending,
  onResume,
}: {
  domain: Domain;
  showTriage: boolean;
  resumePending: boolean;
  onResume: () => void;
}) {
  if (!domain.isActiveForReview) {
    return (
      <div className="flex flex-col gap-2 rounded-field bg-base-200/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-sm text-base-content/70">
          Paused — left out of Read, Review and Quiz.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 shrink-0 md:min-h-8"
          isDisabled={resumePending}
          onPress={onResume}
        >
          {resumePending ? "Resuming…" : "Resume"}
        </Button>
      </div>
    );
  }

  if (domain.termCount === 0) return null;

  const links = showTriage ? [...STUDY_LINKS, TRIAGE_LINK] : STUDY_LINKS;

  return (
    <nav
      aria-label={`Study ${domain.name}`}
      className={cn("grid gap-2 sm:flex", showTriage ? "grid-cols-2" : "grid-cols-3")}
    >
      {links.map(({ path, label, icon: Icon }) => (
        <LinkButton
          key={path}
          href={`${path}?domain=${domain.id}`}
          variant={path === "/jargon/read" ? "default" : "outline"}
          size="sm"
          className="min-h-11 gap-2 md:min-h-8"
        >
          <Icon className="size-4" aria-hidden strokeWidth={1.5} />
          {label}
        </LinkButton>
      ))}
    </nav>
  );
}

export function JargonDomainHeader({
  domain: serverDomain,
  categoryCount,
  isOwner = false,
  untriagedCount,
  onAddTerm,
}: JargonDomainHeaderProps) {
  const { toast } = useToast();
  // Shows the new state at once; the action re-renders the page with the
  // saved value, and a failed save falls back to it on its own.
  const [isActiveForReview, setOptimisticActive] = useOptimistic(serverDomain.isActiveForReview);
  const [togglePending, startToggle] = useTransition();
  const domain = { ...serverDomain, isActiveForReview };

  function setActiveForReview(active: boolean) {
    startToggle(async () => {
      setOptimisticActive(active);
      const { error } = await toggleActiveForReview(domain.id, active);
      if (error) toast(error, "destructive");
    });
  }

  return (
    <header className="shadow-surface space-y-4 rounded-box bg-base-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-heading line-clamp-2 text-xl font-medium">
            {domain.icon ? `${domain.icon} ` : ""}
            {domain.name}
          </h1>
          {domain.termCount > 0 ? (
            <p className="text-sm tabular-nums text-base-content/70">
              {domain.termsLearnedCount} of {domain.termCount} mastered or marked known
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isOwner && onAddTerm ? (
            <AddTermsMenu domainId={domain.id} onAddTerm={onAddTerm} />
          ) : null}
          <DomainActionsMenu
            domain={domain}
            togglePending={togglePending}
            onToggleActiveForReview={() => setActiveForReview(!domain.isActiveForReview)}
          />
        </div>
      </div>

      <DomainMeta domain={domain} categoryCount={categoryCount} />

      <CollectionStudyActions
        domain={domain}
        showTriage={untriagedCount > 0}
        resumePending={togglePending}
        onResume={() => setActiveForReview(true)}
      />
    </header>
  );
}
