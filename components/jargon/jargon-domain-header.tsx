"use client";

import { BookOpen, Layers, Plus, Sparkles, Zap } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { useReviewToggle } from "@/hooks/use-review-toggle";
import { cn } from "@/lib/utils";
import type { Domain, Term } from "@/lib/jargon/types";
import { DomainActionsMenu, DomainMeta } from "./domain-actions-menu";

type JargonDomainHeaderProps = {
  domain: Domain;
  domains: Domain[];
  terms: Term[];
  categoryCount: number;
  isOwner?: boolean;
  /** Terms not yet known or marked known — Triage only shows while > 0. */
  untriagedCount: number;
  onAddTerm?: () => void;
  onToggleActiveForReviewLocal: (domainId: string, active: boolean) => void;
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
      <div className="flex flex-col gap-2 rounded-xl bg-base-200/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
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
      data-tour="library-study"
      className={cn("grid gap-2 sm:flex", showTriage ? "grid-cols-2" : "grid-cols-3")}
    >
      {links.map(({ path, label, icon: Icon }) => (
        <LinkButton
          key={path}
          href={`${path}?domain=${domain.id}`}
          variant="outline"
          size="sm"
          className="min-h-11 gap-1.5 md:min-h-8"
        >
          <Icon className="size-4" aria-hidden strokeWidth={1.5} />
          {label}
        </LinkButton>
      ))}
    </nav>
  );
}

export function JargonDomainHeader({
  domain,
  domains,
  terms,
  categoryCount,
  isOwner = false,
  untriagedCount,
  onAddTerm,
  onToggleActiveForReviewLocal,
}: JargonDomainHeaderProps) {
  const { setActiveForReview, pendingId } = useReviewToggle(onToggleActiveForReviewLocal);
  const togglePending = pendingId === domain.id;
  const progressPct =
    domain.termCount > 0 ? Math.round((domain.termsLearnedCount / domain.termCount) * 100) : 0;

  return (
    <header className="shadow-surface space-y-4 rounded-2xl bg-base-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-heading truncate text-xl font-semibold tracking-tight">
            {domain.icon ? `${domain.icon} ` : ""}
            {domain.name}
          </h1>
          {domain.termCount > 0 ? (
            <p className="text-sm tabular-nums text-base-content/60">
              {domain.termsLearnedCount} of {domain.termCount} learned · {progressPct}%
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isOwner && onAddTerm ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-base-content/60 hover:text-base-content"
              aria-label="Add term"
              onPress={onAddTerm}
            >
              <Plus className="size-5" strokeWidth={1.5} />
            </Button>
          ) : null}
          <DomainActionsMenu
            domain={domain}
            domains={domains}
            terms={terms}
            togglePending={togglePending}
            onToggleActiveForReview={() =>
              void setActiveForReview(domain.id, !domain.isActiveForReview)
            }
          />
        </div>
      </div>

      <DomainMeta domain={domain} categoryCount={categoryCount} />

      <CollectionStudyActions
        domain={domain}
        showTriage={untriagedCount > 0}
        resumePending={togglePending}
        onResume={() => void setActiveForReview(domain.id, true)}
      />
    </header>
  );
}
