"use client";

import { AlertCircle, ArrowLeft, ArrowRight, PartyPopper } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from "react";
import {
  getNextReadTermAction,
  type NextReadTermResult,
} from "@/app/(private)/jargon/read/actions";
import {
  QuizKeyboardHint,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
} from "@/components/jargon/quiz/quiz-ui";
import { TermBody } from "@/components/jargon/term-body";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { formatPickDebugLine } from "@/lib/smart-queue/reasons";
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

function allUnknownCount(collections: StudyCollection[]) {
  return countTermsForSelection(collections, "all", "unknown");
}

function unreadCountForSelection(domainId: string, collections: StudyCollection[]) {
  if (domainId === "all") return allUnknownCount(collections);
  return collections.find((collection) => collection.id === domainId)?.unknownCount ?? 0;
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

function ReadPickDebug({ term }: { term: ReviewTerm }) {
  if (term.pickScore === undefined || !term.pickReasons) return null;

  return (
    <p className="m-0 text-xs leading-relaxed text-base-content/40" aria-label="Queue score debug">
      {formatPickDebugLine(term.pickScore, term.pickReasons, "read")}
    </p>
  );
}

function ReadCaughtUp({
  description,
  showLibraryLinks,
  onCheckAgain,
  isPending,
}: {
  description: string;
  showLibraryLinks: boolean;
  onCheckAgain: () => void;
  isPending: boolean;
}) {
  return (
    <QuizPanel>
      <QuizPanelHeader icon={PartyPopper} title="You're all caught up" description={description} />
      <QuizPanelBody>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            onPress={onCheckAgain}
            isDisabled={isPending}
            className={PRESS_CLASS}
          >
            {isPending ? "Loading…" : "Check again"}
          </Button>
          {showLibraryLinks ? (
            <>
              <LinkButton href="/jargon" variant="outline">
                Collections
              </LinkButton>
              <LinkButton href="/jargon/import" variant="outline">
                Import jargon
              </LinkButton>
            </>
          ) : null}
        </div>
      </QuizPanelBody>
    </QuizPanel>
  );
}

function ReadTermCard({
  term,
  canGoBack,
  isPending,
  onPrevious,
  onNext,
}: {
  term: ReviewTerm;
  canGoBack: boolean;
  isPending: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [term.id]);

  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-base-300/60 px-5 py-3 sm:px-6">
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
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        <TermBody key={term.id} term={term} />
        <ReadPickDebug term={term} />
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-base-300/60 px-5 py-3 sm:px-6">
        <div className="hidden min-w-0 md:block coarse:hidden">
          <QuizKeyboardHint action="go to the next term" />
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
          <Button
            type="button"
            onPress={onNext}
            isDisabled={isPending}
            className={`min-h-11 flex-1 ps-4 pe-3.5 md:flex-none ${PRESS_CLASS}`}
          >
            {isPending ? "Loading…" : "Next term"}
            <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
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
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        <Button
          type="button"
          size="sm"
          onPress={onRetry}
          isDisabled={isPending}
          className={PRESS_CLASS}
        >
          {isPending ? "Loading…" : "Try again"}
        </Button>
      </AlertDescription>
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
  const remaining = unreadCountForSelection(selectedCollectionId, collections);

  return (
    <div className="flex items-center gap-3">
      <Select
        className="min-w-0 w-full flex-1 sm:max-w-xs"
        selectedKey={selectedCollectionId}
        onSelectionChange={(key) => {
          if (key == null) return;
          onChange(String(key));
        }}
        isDisabled={isDisabled}
      >
        <SelectTrigger id="read-collection" size="sm" aria-label="Collection" className="text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem id="all">All active collections ({allUnknownCount(collections)})</SelectItem>
          {collections.map((collection) => (
            <SelectItem key={collection.id} id={collection.id}>
              {collection.name} ({collection.unknownCount})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="shrink-0 text-xs text-base-content/50 tabular-nums">{remaining} unread</span>
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
    return "No unknown terms left in your active collections. Import more terms or turn a collection back on to keep reading.";
  }

  const name = collectionName(domainId, collections);
  if (!name) {
    return "No unknown terms left in this collection. Pick another collection to keep reading.";
  }

  return `No unknown terms left in ${name}. Pick another collection to keep reading.`;
}

type NavState = {
  term: ReviewTerm | null;
  history: ReviewTerm[];
  future: ReviewTerm[];
};

type NavAction =
  | { type: "fetched"; term: ReviewTerm }
  | { type: "redo" }
  | { type: "back" }
  | { type: "clear" }
  | { type: "dropRedo" };

function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "fetched": {
      const history = state.term ? [...state.history, state.term] : state.history;
      return { term: action.term, history, future: [] };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const term = state.future[state.future.length - 1];
      const future = state.future.slice(0, -1);
      const history = state.term ? [...state.history, state.term] : state.history;
      return { term, history, future };
    }
    case "back": {
      if (state.history.length === 0) return state;
      const term = state.history[state.history.length - 1];
      const history = state.history.slice(0, -1);
      const future = state.term ? [...state.future, state.term] : state.future;
      return { term, history, future };
    }
    case "clear":
      return { ...state, term: null };
    case "dropRedo":
      return { ...state, future: [] };
    default:
      return state;
  }
}

type ReadPageProps = {
  initialResult: NextReadTermResult;
  collections: StudyCollection[];
  domainId: string;
};

export function ReadPage({ initialResult, collections, domainId }: ReadPageProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(domainId);
  const [status, setStatus] = useState<ReadStatus>(() => statusFromResult(initialResult));
  const [nav, dispatch] = useReducer(navReducer, {
    term: initialResult.term ?? null,
    history: [],
    future: [],
  });
  const { term, history } = nav;
  const [lastPickedDomainId, setLastPickedDomainId] = useState(domainId);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialResult.error ?? null);
  const [isPending, startTransition] = useTransition();
  const navRef = useRef(nav);
  const statusRef = useRef(status);
  const selectedCollectionIdRef = useRef(selectedCollectionId);
  const fetchingRef = useRef(false);
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

        dispatch({ type: "fetched", term: result.term });
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
      fetchNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fetchNext]);

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
            onCheckAgain={fetchNext}
            isPending={isPending}
          />
        ) : null}

        {status === "ready" && term !== null ? (
          <ReadTermCard
            term={term}
            canGoBack={history.length > 0}
            isPending={isPending}
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
