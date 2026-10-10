"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { markStoryReadAction, voteStoryAction } from "@/app/(private)/app/read/stories/actions";
import { useToast } from "@/components/ui/toast";
import type { AiFailureReason } from "@/lib/llm/types";
import { voteFeedback } from "@/lib/stories/feedback";
import type { StoriesSetupData } from "@/lib/stories/setup";
import { readStoryStream, type StoryStreamEvent } from "@/lib/stories/stream";
import {
  DEFAULT_CEFR_LEVEL,
  DEFAULT_PIECE_LENGTH,
  DEFAULT_READING_LEVEL,
  type CefrLevel,
  type PieceLength,
  type ReadingLevel,
  type Story,
  type StoryLevels,
  type StoryTerm,
} from "@/lib/stories/types";

type StoryStep = "setup" | "generating" | "reading" | "error";
type StoryOutcome = Extract<StoryStreamEvent, { type: "done" | "error" }>;

const GENERIC_ERROR: StoryOutcome = {
  type: "error",
  error: "Couldn't write a story this time. Try again.",
  reason: "unavailable",
};

/** Asks the route for a story and passes the reply on as it arrives. */
async function requestStory(
  input: object,
  onEvent: (event: StoryStreamEvent) => void,
): Promise<StoryOutcome> {
  try {
    const response = await fetch("/api/stories/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok || !response.body) return GENERIC_ERROR;
    for await (const event of readStoryStream(response.body)) {
      if (event.type === "done" || event.type === "error") return event;
      onEvent(event);
    }
  } catch (err) {
    console.error("Story request failed:", err);
  }
  return GENERIC_ERROR;
}

const DEFAULT_LEVELS: StoryLevels = {
  readingLevel: DEFAULT_READING_LEVEL,
  cefrLevel: DEFAULT_CEFR_LEVEL,
  pieceLength: DEFAULT_PIECE_LENGTH,
};

export function useStorySession(setup: StoriesSetupData) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<StoryStep>(setup.currentStory ? "reading" : "setup");
  const [collectionId, setCollectionId] = useState(setup.initialCollectionId);
  const [levelsByCollection, setLevelsByCollection] = useState(setup.levelsByCollection);
  const initialLevels =
    (setup.initialCollectionId && setup.levelsByCollection[setup.initialCollectionId]) ||
    DEFAULT_LEVELS;
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>(initialLevels.readingLevel);
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(initialLevels.cefrLevel);
  const [pieceLength, setPieceLength] = useState<PieceLength>(initialLevels.pieceLength);
  const [outline, setOutline] = useState("");
  const [story, setStory] = useState<Story | null>(setup.currentStory?.story ?? null);
  const [terms, setTerms] = useState<StoryTerm[]>(setup.currentStory?.terms ?? []);
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<AiFailureReason | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const busyRef = useRef(false);
  // The story on screen right now, so a late vote result can tell whether the
  // user has already moved on.
  const currentStoryIdRef = useRef(story?.id);
  currentStoryIdRef.current = story?.id;

  function selectCollection(nextCollectionId: string) {
    setCollectionId(nextCollectionId);
    const levels = levelsByCollection[nextCollectionId] ?? DEFAULT_LEVELS;
    setReadingLevel(levels.readingLevel);
    setCefrLevel(levels.cefrLevel);
    setPieceLength(levels.pieceLength);
  }

  // A story opened from the history is in the URL; once the user moves on,
  // a refresh shouldn't bring it back.
  function clearStoryParam() {
    if (!searchParams.has("story")) return;
    const params = new URLSearchParams(searchParams);
    params.delete("story");
    const query = params.toString();
    router.replace(query ? `/app/read/stories?${query}` : "/app/read/stories");
  }

  function showStory(result: { story: Story; terms: StoryTerm[] }) {
    setStory(result.story);
    setTerms(result.terms);
    setDraft("");
    setErrorMessage(null);
    setStep("reading");
  }

  async function generate() {
    if (busyRef.current || !collectionId) return;
    busyRef.current = true;
    setStep("generating");
    setDraft("");
    setErrorMessage(null);
    setErrorReason(null);

    const levels = { readingLevel, cefrLevel, pieceLength };
    const result = await requestStory({ collectionId, ...levels, outline }, (event) => {
      if (event.type === "text") setDraft((current) => current + event.text);
      if (event.type === "reset") setDraft("");
    });
    busyRef.current = false;
    // The balance may have changed either way, so refresh what shows it.
    router.refresh();

    if (result.type === "error") {
      setErrorMessage(result.error);
      setErrorReason(result.reason ?? null);
      setDraft("");
      setStep("error");
      return;
    }
    setLevelsByCollection((current) => ({ ...current, [collectionId]: levels }));
    setOutline("");
    clearStoryParam();
    showStory(result);
  }

  async function markRead() {
    if (!story || story.readAt || isMarkingRead) return;
    setIsMarkingRead(true);
    const result = await markStoryReadAction(story.id);
    setIsMarkingRead(false);
    if ("error" in result) {
      toast(result.error, "destructive");
      return;
    }
    const readAt = result.readAt ?? new Date().toISOString();
    setStory((current) => (current ? { ...current, readAt } : current));
  }

  async function vote(value: -1 | 1) {
    if (!story) return;
    const previous = story.vote;
    const next = previous === value ? null : value;
    setStory({ ...story, vote: next });
    const storyId = story.id;
    const result = await voteStoryAction(storyId, next);
    const stillShowing = currentStoryIdRef.current === storyId;
    if (result.error) {
      if (stillShowing) {
        setStory((current) => (current ? { ...current, vote: previous } : current));
      }
      toast(result.error, "destructive");
      return;
    }
    if (stillShowing) toast(voteFeedback(next));
  }

  function backToSetup() {
    setErrorMessage(null);
    setStep("setup");
    clearStoryParam();
    router.refresh();
  }

  return {
    step,
    collectionId,
    selectCollection,
    readingLevel,
    setReadingLevel,
    cefrLevel,
    setCefrLevel,
    pieceLength,
    setPieceLength,
    outline,
    setOutline,
    story,
    terms,
    draft,
    errorMessage,
    setErrorMessage,
    errorReason,
    isMarkingRead,
    generate,
    markRead,
    vote,
    backToSetup,
  };
}

export type StorySession = ReturnType<typeof useStorySession>;
