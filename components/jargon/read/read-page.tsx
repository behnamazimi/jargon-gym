"use client";

import { AlertCircle, ArrowLeft, ArrowRight, PartyPopper } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from "react";
import {
  getNextReadTermAction,
  type NextReadTermResult,
} from "@/app/(private)/jargon/read/actions";
import {
  QuizActionBar,
  QuizCenteredState,
  QuizKeyboardHint,
  QuizPanel,
  QuizPanelBody,
} from "@/components/jargon/quiz/quiz-ui";
import { TermBody } from "@/components/jargon/term-body";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ReviewTerm } from "@/lib/review/types";
import { formatPickDebugLine } from "@/lib/smart-queue/reasons";

const PRESS_CLASS = "transition-transform duration-150 ease-out active:scale-[0.96]";

type ReadStatus = "ready" | "caughtUp" | "error";

function statusFromResult(result: NextReadTermResult): ReadStatus {
  if (result.error) return "error";
  if (result.caughtUp || !result.term) return "caughtUp";
  return "ready";
}

function scrollToTop() {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
  window.scrollTo({ top: 0, behavior });
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
  onCheckAgain,
  isPending,
}: {
  onCheckAgain: () => void;
  isPending: boolean;
}) {
  return (
    <QuizPanel>
      <QuizPanelBody>
        <QuizCenteredState
          icon={PartyPopper}
          title="You're all caught up"
          description="No unknown terms left in your active collections. Import more terms or turn a collection back on to keep reading."
        >
          <Button
            variant="outline"
            onPress={onCheckAgain}
            isDisabled={isPending}
            className={PRESS_CLASS}
          >
            {isPending ? "Loading…" : "Check again"}
          </Button>
        </QuizCenteredState>
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
  return (
    <QuizPanel>
      <header className="border-b border-base-300/60 px-5 py-5 sm:px-6">
        <h2 className="font-heading m-0 text-2xl font-semibold tracking-tight text-base-content sm:text-[1.75rem] sm:leading-tight">
          {term.term}
        </h2>
        <p className="mt-2 mb-0 text-xs tracking-wide text-base-content/50">
          <span>{term.domainName}</span>
          <span className="mx-1.5 text-base-content/35" aria-hidden>
            ·
          </span>
          <span>{term.category}</span>
        </p>
      </header>
      <QuizPanelBody className="space-y-6">
        <TermBody term={term} />

        <QuizActionBar hint={<QuizKeyboardHint action="go to the next term" />}>
          {canGoBack ? (
            <Button
              type="button"
              variant="outline"
              onPress={onPrevious}
              isDisabled={isPending}
              className={`pe-4 ps-3.5 ${PRESS_CLASS}`}
            >
              <ArrowLeft className="size-4" aria-hidden strokeWidth={1.5} />
              Previous
            </Button>
          ) : null}
          <Button
            type="button"
            onPress={onNext}
            isDisabled={isPending}
            className={`ps-4 pe-3.5 ${PRESS_CLASS}`}
          >
            {isPending ? "Loading…" : "Next term"}
            <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
        </QuizActionBar>

        <ReadPickDebug term={term} />
      </QuizPanelBody>
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

type NavState = {
  term: ReviewTerm | null;
  history: ReviewTerm[];
  future: ReviewTerm[];
};

type NavAction =
  | { type: "fetched"; term: ReviewTerm }
  | { type: "redo" }
  | { type: "back" }
  | { type: "clear" };

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
    default:
      return state;
  }
}

type ReadPageProps = {
  initialResult: NextReadTermResult;
};

export function ReadPage({ initialResult }: ReadPageProps) {
  const [status, setStatus] = useState<ReadStatus>(() => statusFromResult(initialResult));
  const [nav, dispatch] = useReducer(navReducer, {
    term: initialResult.term ?? null,
    history: [],
    future: [],
  });
  const { term, history } = nav;
  const [errorMessage, setErrorMessage] = useState<string | null>(initialResult.error ?? null);
  const [isPending, startTransition] = useTransition();
  const navRef = useRef(nav);
  const statusRef = useRef(status);
  const fetchingRef = useRef(false);

  navRef.current = nav;
  statusRef.current = status;

  const fetchNext = useCallback(() => {
    if (navRef.current.future.length > 0) {
      dispatch({ type: "redo" });
      setStatus("ready");
      scrollToTop();
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const result = await getNextReadTermAction();

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
        scrollToTop();
      } finally {
        fetchingRef.current = false;
      }
    });
  }, [startTransition]);

  const goToPrevious = useCallback(() => {
    dispatch({ type: "back" });
    setStatus("ready");
    scrollToTop();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      if (statusRef.current !== "ready" || fetchingRef.current) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      fetchNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fetchNext]);

  return (
    <>
      {status === "caughtUp" ? (
        <ReadCaughtUp onCheckAgain={fetchNext} isPending={isPending} />
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
    </>
  );
}
