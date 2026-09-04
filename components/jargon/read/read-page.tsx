"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Eye, PartyPopper } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from "react";
import {
  getNextReadTermAction,
  recordReadRevealAction,
  type NextReadTermResult,
} from "@/app/(private)/jargon/read/actions";
import {
  QuizKeyboardHint,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
} from "@/components/jargon/quiz/quiz-ui";
import { TermNarrationPlayer } from "@/components/jargon/read/term-narration-player";
import { TermBody } from "@/components/jargon/term-body";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_MEDIA } from "@/lib/platform";
import type { ReviewTerm } from "@/lib/review/types";
import { countTermsForSelection } from "@/lib/study/count";
import type { StudyCollection } from "@/lib/study/types";

const PRESS_CLASS = "transition-transform duration-150 ease-out active:scale-[0.96]";

type ReadStatus = "ready" | "caughtUp" | "error";

function statusFromResult(result: NextReadTermResult): ReadStatus {
  if (result.error) return "error";
  if (result.caughtUp || !result.term) return "caughtUp";
  return "ready";
}

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

function ReadCaughtUp({
  description,
  showLibraryLinks,
}: {
  description: string;
  showLibraryLinks: boolean;
}) {
  return (
    <QuizPanel>
      <QuizPanelHeader icon={PartyPopper} title="You're all caught up" description={description} />
      <QuizPanelBody>
        {showLibraryLinks ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <LinkButton href="/jargon" variant="outline">
              Collections
            </LinkButton>
            <LinkButton href="/jargon/import" variant="outline">
              Import jargon
            </LinkButton>
          </div>
        ) : null}
      </QuizPanelBody>
    </QuizPanel>
  );
}

function ReadCardHeader({ term, narrationAccess }: { term: ReviewTerm; narrationAccess: boolean }) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-base-300/60 px-5 py-3 sm:px-6">
      <div>
        <h2 className="font-heading m-0 text-xl font-semibold tracking-tight text-base-content sm:text-2xl sm:leading-tight">
          {term.term}
        </h2>
        <p className="mt-1 mb-0 text-xs tracking-wide text-base-content/50">
          <span>{term.domainName}</span>
          <span className="mx-1.5 text-base-content/35" aria-hidden>
            ·
          </span>
          <span>{term.category}</span>
        </p>
      </div>
      {narrationAccess ? <TermNarrationPlayer termId={term.id} /> : null}
    </header>
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
}: {
  term: ReviewTerm;
  narrationAccess: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [term.id]);

  return (
    <>
      <ReadCardHeader term={term} narrationAccess={narrationAccess} />
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        <TermBody key={term.id} term={term} />
      </div>
    </>
  );
}

function ReadTermCard({
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
  onReveal: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      {revealed ? (
        <ReadCardRevealed term={term} narrationAccess={narrationAccess} />
      ) : (
        <ReadCardMasked term={term} onReveal={onReveal} />
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
              onPress={onReveal}
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
}

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

function ReadCollectionSelect({
  collections,
  selectedCollectionId,
  isDisabled,
  onChange,
}: {
  collections: StudyCollection[];
  selectedCollectionId: string;
  isDisabled: boolean;
  onChange: (domainId: string) => void;
}) {
  const remaining = termCountForSelection(selectedCollectionId, collections);

  return (
    <div className="flex items-center gap-3">
      <Select
        className="min-w-0 w-full flex-1 sm:max-w-xs"
        value={selectedCollectionId}
        onChange={(key) => {
          if (key == null) return;
          onChange(String(key));
        }}
        isDisabled={isDisabled}
      >
        <SelectTrigger id="read-collection" size="sm" aria-label="Collection" className="text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem id="all">All active collections ({allTermCount(collections)})</SelectItem>
          {collections.map((collection) => (
            <SelectItem key={collection.id} id={collection.id}>
              {collection.name} ({collection.termCount})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="shrink-0 text-xs text-base-content/50 tabular-nums">
        {remaining} available
      </span>
    </div>
  );
}

function collectionName(domainId: string, collections: StudyCollection[]) {
  return collections.find((collection) => collection.id === domainId)?.name;
}

function caughtUpDescription(
  domainId: string,
  lastPickedDomainId: string,
  collections: StudyCollection[],
) {
  if (domainId !== lastPickedDomainId) {
    const name = collectionName(domainId, collections);
    return name
      ? `Collection changed. Check again to read from ${name}.`
      : "Collection changed. Check again to read from your active collections.";
  }

  if (domainId === "all") {
    return "No terms in your active collections. Import some terms or turn a collection back on to start reading.";
  }

  const name = collectionName(domainId, collections);
  if (!name) {
    return "No terms in this collection. Pick another collection to keep reading.";
  }

  return `No terms in ${name}. Pick another collection to keep reading.`;
}

type NavEntry = { term: ReviewTerm; revealed: boolean };

type NavState = {
  entry: NavEntry | null;
  history: NavEntry[];
  future: NavEntry[];
};

type NavAction =
  | { type: "fetched"; term: ReviewTerm; revealed: boolean }
  | { type: "redo" }
  | { type: "back" }
  | { type: "clear" }
  | { type: "dropRedo" }
  | { type: "reveal" };

function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "fetched": {
      const entry = { term: action.term, revealed: action.revealed };
      const history = state.entry ? [...state.history, state.entry] : state.history;
      return { entry, history, future: [] };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const entry = state.future[state.future.length - 1];
      const future = state.future.slice(0, -1);
      const history = state.entry ? [...state.history, state.entry] : state.history;
      return { entry, history, future };
    }
    case "back": {
      if (state.history.length === 0) return state;
      const entry = state.history[state.history.length - 1];
      const history = state.history.slice(0, -1);
      const future = state.entry ? [...state.future, state.entry] : state.future;
      return { entry, history, future };
    }
    case "clear":
      return { ...state, entry: null };
    case "dropRedo":
      return { ...state, future: [] };
    case "reveal": {
      if (!state.entry || state.entry.revealed) return state;
      return { ...state, entry: { ...state.entry, revealed: true } };
    }
    default:
      return state;
  }
}

type ReadPageProps = {
  initialResult: NextReadTermResult;
  collections: StudyCollection[];
  domainId: string;
  narrationAccess: boolean;
};

export function ReadPage({ initialResult, collections, domainId, narrationAccess }: ReadPageProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(domainId);
  const [status, setStatus] = useState<ReadStatus>(() => statusFromResult(initialResult));
  const [nav, dispatch] = useReducer(navReducer, {
    entry: initialResult.term
      ? { term: initialResult.term, revealed: initialResult.revealed ?? false }
      : null,
    history: [],
    future: [],
  });
  const { entry, history } = nav;
  const term = entry?.term ?? null;
  const revealed = entry?.revealed ?? false;
  const [lastPickedDomainId, setLastPickedDomainId] = useState(domainId);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialResult.error ?? null);
  const [isPending, startTransition] = useTransition();
  const navRef = useRef(nav);
  const statusRef = useRef(status);
  const selectedCollectionIdRef = useRef(selectedCollectionId);
  const fetchingRef = useRef(false);
  const revealGuardRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  navRef.current = nav;
  statusRef.current = status;
  selectedCollectionIdRef.current = selectedCollectionId;

  useEffect(() => {
    stripInvalidDomainParam(domainId);
  }, [domainId]);

  const fetchNext = useCallback(() => {
    if (navRef.current.future.length > 0) {
      dispatch({ type: "redo" });
      setStatus("ready");
      scrollToTop(cardRef.current);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const requestedDomainId = selectedCollectionIdRef.current;

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const result = await getNextReadTermAction(requestedDomainId);

        if (selectedCollectionIdRef.current !== requestedDomainId) return;

        setLastPickedDomainId(requestedDomainId);

        if (result.error) {
          setStatus("error");
          setErrorMessage(result.error);
          return;
        }

        if (result.caughtUp || !result.term) {
          dispatch({ type: "clear" });
          setStatus("caughtUp");
          return;
        }

        dispatch({ type: "fetched", term: result.term, revealed: false });
        setStatus("ready");
        scrollToTop(cardRef.current);
      } finally {
        fetchingRef.current = false;
      }
    });
  }, [startTransition]);

  const goToPrevious = useCallback(() => {
    dispatch({ type: "back" });
    setStatus("ready");
    scrollToTop(cardRef.current);
  }, []);

  const handleReveal = useCallback(() => {
    const entry = navRef.current.entry;
    if (!entry || entry.revealed) return;
    // navRef.current only gets reassigned to the next render's state on the
    // following render pass, so two reveal triggers landing in the same
    // tick (e.g. a fast double-click/double-tap, or Enter racing a click)
    // would otherwise both read a stale revealed: false and both call
    // recordReadRevealAction, double-counting the read. Guard against that
    // synchronously via a ref keyed on the term id, rather than mutating
    // the reducer's entry object in place (which would make the "reveal"
    // action's next-state equal the current state by reference, and
    // useReducer bails out of re-rendering when that happens).
    if (revealGuardRef.current === entry.term.id) return;
    revealGuardRef.current = entry.term.id;
    dispatch({ type: "reveal" });
    void recordReadRevealAction(entry.term.id);
  }, []);

  const handleCollectionChange = useCallback((nextDomainId: string) => {
    if (nextDomainId === selectedCollectionIdRef.current) return;

    setSelectedCollectionId(nextDomainId);
    dispatch({ type: "dropRedo" });
    replaceReadDomainInUrl(nextDomainId);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      if (statusRef.current !== "ready" || fetchingRef.current) return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      if (navRef.current.entry && !navRef.current.entry.revealed) {
        handleReveal();
      } else {
        fetchNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fetchNext, handleReveal]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {collections.length > 0 ? (
        <ReadCollectionSelect
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          isDisabled={isPending}
          onChange={handleCollectionChange}
        />
      ) : null}

      <div ref={cardRef} className="flex min-h-0 flex-1 flex-col">
        {status === "caughtUp" ? (
          <ReadCaughtUp
            description={caughtUpDescription(selectedCollectionId, lastPickedDomainId, collections)}
            showLibraryLinks={
              selectedCollectionId === lastPickedDomainId && selectedCollectionId === "all"
            }
          />
        ) : null}

        {status === "ready" && term !== null ? (
          <ReadTermCard
            term={term}
            revealed={revealed}
            canGoBack={history.length > 0}
            isPending={isPending}
            narrationAccess={narrationAccess}
            onReveal={handleReveal}
            onPrevious={goToPrevious}
            onNext={fetchNext}
          />
        ) : null}

        {status === "error" ? (
          <ReadErrorAlert
            message={errorMessage ?? "Couldn't load the next term. Try again."}
            isPending={isPending}
            onRetry={fetchNext}
          />
        ) : null}
      </div>
    </div>
  );
}
