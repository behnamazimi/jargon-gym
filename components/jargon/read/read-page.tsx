"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Eye, Maximize } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ReadQueueSeed } from "@/app/(private)/jargon/read/actions";
import { CollectionSelect } from "@/components/jargon/collection-select";
import { FirstExposureKnownPrompt } from "@/components/jargon/first-exposure-known-prompt";
import { QuizKeyboardHint, QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { ReadCaughtUp } from "@/components/jargon/read/read-caught-up";
import { ReadFullscreenFeed } from "@/components/jargon/read/read-fullscreen-feed";
import { useReadQueue } from "@/components/jargon/read/use-read-queue";
import { TermCardHeader } from "@/components/jargon/term-card-header";
import { TermBody } from "@/components/jargon/term-body";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { requestFullscreenOnDocument } from "@/hooks/use-fullscreen-exit";
import { useReadFullscreenPreference } from "@/hooks/use-read-fullscreen-preference";
import { PLATFORM_MEDIA } from "@/lib/platform";
import type { ReviewTerm } from "@/lib/review/types";
import { countTermsForSelection } from "@/lib/study/count";
import type { StudyCollection } from "@/lib/study/types";
import { cn } from "@/lib/utils";

const PRESS_CLASS = "transition-transform duration-150 ease-out active:scale-[0.96]";

function scrollToTop(cardEl: HTMLElement | null) {
  const behavior = window.matchMedia(PLATFORM_MEDIA.reducedMotion).matches ? "instant" : "smooth";

  if (cardEl) {
    cardEl.scrollIntoView({ behavior, block: "start" });
    return;
  }

  window.scrollTo({ top: 0, behavior });
}

function allTermCount(collections: StudyCollection[]) {
  return countTermsForSelection(collections, "all");
}

function termCountForSelection(domainId: string, collections: StudyCollection[]) {
  if (domainId === "all") return allTermCount(collections);
  return collections.find((collection) => collection.id === domainId)?.termCount ?? 0;
}

function replaceReadDomainInUrl(domainId: string) {
  const url = new URL(window.location.href);
  if (domainId === "all") {
    url.searchParams.delete("domain");
  } else {
    url.searchParams.set("domain", domainId);
  }
  url.searchParams.delete("termId");
  url.searchParams.delete("alreadyRead");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function stripInvalidDomainParam(resolvedDomainId: string) {
  const url = new URL(window.location.href);
  const param = url.searchParams.get("domain");
  if (!param) return;
  if (resolvedDomainId !== "all" && param === resolvedDomainId) return;

  url.searchParams.delete("domain");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable ||
    target.closest("[data-slot='select']") !== null ||
    target.closest("[role='listbox']") !== null
  );
}

function ReadCardMasked({ term, onReveal }: { term: ReviewTerm; onReveal: () => void }) {
  return (
    <div
      className="flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-3 px-5 py-4 text-center sm:px-6"
      role="button"
      tabIndex={0}
      onClick={onReveal}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onReveal();
        }
      }}
      aria-label={`What is ${term.term}? Tap to reveal the definition.`}
    >
      <h2 className="font-heading m-0 max-w-full text-2xl font-semibold tracking-tight text-balance text-base-content sm:text-3xl sm:leading-tight">
        What is <span className="italic">{term.term}</span>?
      </h2>
      <p className="m-0 text-xs tracking-wide text-base-content/50">
        <span>{term.domainName}</span>
        <span className="mx-1.5 text-base-content/35" aria-hidden>
          ·
        </span>
        <span>{term.category}</span>
      </p>
      <div className="mt-1 flex items-center gap-2 text-sm text-base-content/60">
        <Eye className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
        <span className="inline md:hidden coarse:inline">Tap to reveal</span>
        <span className="hidden md:inline coarse:hidden">Click or press Enter to reveal</span>
      </div>
    </div>
  );
}

function ReadCardRevealed({
  term,
  narrationAccess,
  onMarkedKnown,
}: {
  term: ReviewTerm;
  narrationAccess: boolean;
  onMarkedKnown: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [term.id]);

  return (
    <>
      <TermCardHeader term={term} narrationAccess={narrationAccess} />
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {term.isNewToUser ? (
          <FirstExposureKnownPrompt termId={term.id} onMarkedKnown={onMarkedKnown} />
        ) : null}
        <TermBody key={term.id} term={term} />
      </div>
    </>
  );
}

const ReadTermCard = memo(function ReadTermCard({
  term,
  revealed,
  canGoBack,
  isPending,
  narrationAccess,
  onReveal,
  onPrevious,
  onNext,
}: {
  term: ReviewTerm;
  revealed: boolean;
  canGoBack: boolean;
  isPending: boolean;
  narrationAccess: boolean;
  onReveal: (termId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      {revealed ? (
        <ReadCardRevealed term={term} narrationAccess={narrationAccess} onMarkedKnown={onNext} />
      ) : (
        <ReadCardMasked term={term} onReveal={() => onReveal(term.id)} />
      )}
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-base-300/60 px-5 py-3 sm:px-6">
        <div className="hidden min-w-0 md:block coarse:hidden">
          <QuizKeyboardHint action={revealed ? "go to the next term" : "reveal the answer"} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {canGoBack ? (
            <Button
              type="button"
              variant="outline"
              onPress={onPrevious}
              isDisabled={isPending}
              className={`min-h-11 pe-4 ps-3.5 ${PRESS_CLASS}`}
            >
              <ArrowLeft className="size-4" aria-hidden strokeWidth={1.5} />
              Previous
            </Button>
          ) : null}
          {revealed ? (
            <Button
              type="button"
              onPress={onNext}
              isDisabled={isPending}
              className={`min-h-11 flex-1 ps-4 pe-3.5 md:flex-none ${PRESS_CLASS}`}
            >
              {isPending ? "Loading…" : "Next term"}
              <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
            </Button>
          ) : (
            <Button
              type="button"
              onPress={() => onReveal(term.id)}
              className={`min-h-11 flex-1 ps-4 pe-3.5 md:flex-none ${PRESS_CLASS}`}
            >
              Reveal
              <Eye className="size-4" aria-hidden strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </footer>
    </QuizPanel>
  );
});

function ReadErrorAlert({
  message,
  isPending,
  onRetry,
}: {
  message: string;
  isPending: boolean;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden strokeWidth={1.5} />
      <AlertDescription>{message}</AlertDescription>
      <AlertAction>
        <Button
          type="button"
          size="sm"
          onPress={onRetry}
          isDisabled={isPending}
          className={PRESS_CLASS}
        >
          {isPending ? "Loading…" : "Try again"}
        </Button>
      </AlertAction>
    </Alert>
  );
}

function collectionName(domainId: string, collections: StudyCollection[]) {
  return collections.find((collection) => collection.id === domainId)?.name;
}

function caughtUpDescription(domainId: string, collections: StudyCollection[]) {
  if (domainId === "all") {
    return "No terms in your active collections. Import some terms or turn a collection back on to start reading.";
  }

  const name = collectionName(domainId, collections);
  if (!name) {
    return "No terms in this collection. Pick another collection to keep reading.";
  }

  return `No terms in ${name}. Pick another collection to keep reading.`;
}

type ReadPageProps = {
  seed: ReadQueueSeed;
  collections: StudyCollection[];
  domainId: string;
  narrationAccess: boolean;
};

export function ReadPage({ seed, collections, domainId, narrationAccess }: ReadPageProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(domainId);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const { preferenceOn, setPreference } = useReadFullscreenPreference();
  const queue = useReadQueue({ domainId: selectedCollectionId, seed });
  const selectedCollectionIdRef = useRef(selectedCollectionId);
  const cardRef = useRef<HTMLDivElement>(null);
  const previousTermIdRef = useRef<string | null>(queue.currentTerm?.id ?? null);

  selectedCollectionIdRef.current = selectedCollectionId;

  useEffect(() => {
    stripInvalidDomainParam(domainId);
  }, [domainId]);

  // Scroll back to the top of the card whenever the shown term actually
  // changes (Next/Previous/collection switch/fullscreen hand-off) — but
  // not on every render (e.g. a reveal, which keeps the same term).
  useEffect(() => {
    const currentId = queue.currentTerm?.id ?? null;
    if (previousTermIdRef.current === currentId) return;
    previousTermIdRef.current = currentId;
    scrollToTop(cardRef.current);
  }, [queue.currentTerm]);

  const handleCollectionChange = useCallback((nextDomainId: string) => {
    if (nextDomainId === selectedCollectionIdRef.current) return;
    setSelectedCollectionId(nextDomainId);
    replaceReadDomainInUrl(nextDomainId);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (fullscreenActive) return;
      if (event.key !== "Enter") return;
      if (queue.status !== "ready" || isTypingTarget(event.target)) return;

      const term = queue.currentTerm;
      if (!term) return;

      event.preventDefault();
      if (!queue.isRevealed(term.id)) {
        queue.reveal(term.id);
      } else {
        void queue.goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    fullscreenActive,
    queue.status,
    queue.currentTerm,
    queue.isRevealed,
    queue.reveal,
    queue.goNext,
  ]);

  const handleExitFullscreen = useCallback(() => {
    setFullscreenActive(false);
    setPreference(false);
  }, [setPreference]);

  if (fullscreenActive) {
    return (
      <ReadFullscreenFeed
        queue={queue}
        narrationAccess={narrationAccess}
        onExit={handleExitFullscreen}
      />
    );
  }

  const term = queue.currentTerm;
  const revealed = term ? queue.isRevealed(term.id) : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        {collections.length > 0 ? (
          <div className="flex items-center gap-3">
            <CollectionSelect
              mode="local"
              id="read-collection"
              aria-label="Collection"
              className="min-w-0 w-full flex-1 sm:max-w-xs"
              triggerClassName="text-sm"
              size="sm"
              collections={collections}
              value={selectedCollectionId}
              isDisabled={queue.isFetchingMore}
              leadingOption={{
                id: "all",
                label: `All active collections (${allTermCount(collections)})`,
              }}
              onChange={handleCollectionChange}
            />
            <span className="shrink-0 text-xs text-base-content/50 tabular-nums">
              {termCountForSelection(selectedCollectionId, collections)} available
            </span>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Enter focus mode"
          onPress={() => {
            // Must happen synchronously in this click handler — deferring
            // it into an effect after ReadFullscreenFeed mounts loses the
            // user gesture and silently falls back to the CSS overlay.
            requestFullscreenOnDocument();
            setFullscreenActive(true);
            setPreference(true);
          }}
          className={cn("shrink-0", preferenceOn && "ring-2 ring-primary/60", PRESS_CLASS)}
        >
          <Maximize className="size-4" aria-hidden strokeWidth={1.5} />
        </Button>
      </div>

      <div ref={cardRef} className="flex min-h-0 flex-1 flex-col">
        {queue.status === "caughtUp" ? (
          <ReadCaughtUp
            description={caughtUpDescription(selectedCollectionId, collections)}
            actions={
              selectedCollectionId === "all" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <LinkButton href="/jargon" variant="outline">
                    Collections
                  </LinkButton>
                  <LinkButton href="/jargon/import" variant="outline">
                    Import jargon
                  </LinkButton>
                </div>
              ) : null
            }
          />
        ) : null}

        {queue.status === "ready" && term !== null ? (
          <ReadTermCard
            term={term}
            revealed={revealed}
            canGoBack={queue.canGoBack}
            isPending={queue.isFetchingMore}
            narrationAccess={narrationAccess}
            onReveal={queue.reveal}
            onPrevious={queue.goPrevious}
            onNext={queue.goNext}
          />
        ) : null}

        {queue.status === "error" ? (
          <ReadErrorAlert
            message={queue.errorMessage ?? "Couldn't load the next term. Try again."}
            isPending={queue.isFetchingMore}
            onRetry={queue.retry}
          />
        ) : null}
      </div>
    </div>
  );
}
