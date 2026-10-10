"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  generateStoryAction,
  markStoryReadAction,
  voteStoryAction,
} from "@/app/(private)/app/read/stories/actions";
import { useToast } from "@/components/ui/toast";
import type { AiFailureReason } from "@/lib/llm/types";
import { voteFeedback } from "@/lib/stories/feedback";
import type { StoriesSetupData } from "@/lib/stories/setup";
import {
  DEFAULT_CEFR_LEVEL,
  DEFAULT_PIECE_LENGTH,
  type CefrLevel,
  type PieceLength,
  type Story,
  type StoryLevels,
  type StoryTerm,
} from "@/lib/stories/types";

type StoryStep = "setup" | "generating" | "reading" | "error";
const DEFAULT_LEVELS: StoryLevels = {
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
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(initialLevels.cefrLevel);
  const [pieceLength, setPieceLength] = useState<PieceLength>(initialLevels.pieceLength);
  const [outline, setOutline] = useState("");
  const [story, setStory] = useState<Story | null>(setup.currentStory?.story ?? null);
  const [terms, setTerms] = useState<StoryTerm[]>(setup.currentStory?.terms ?? []);
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
    setErrorMessage(null);
    setStep("reading");
  }

  async function generate() {
    if (busyRef.current || !collectionId) return;
    busyRef.current = true;
    setStep("generating");
    setErrorMessage(null);
    setErrorReason(null);

    const levels = { cefrLevel, pieceLength };
    const result = await generateStoryAction({ collectionId, ...levels, outline });
    busyRef.current = false;
    // The balance may have changed either way, so refresh what shows it.
    router.refresh();

    if ("error" in result) {
      setErrorMessage(result.error);
      setErrorReason(result.reason ?? null);
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
    cefrLevel,
    setCefrLevel,
    pieceLength,
    setPieceLength,
    outline,
    setOutline,
    story,
    terms,
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
