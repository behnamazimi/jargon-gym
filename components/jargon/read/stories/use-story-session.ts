"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  generateStoryAction,
  dismissStoryAction,
  markStoryReadAction,
  voteStoryAction,
  type StoryResult,
} from "@/app/(private)/jargon/read/stories/actions";
import { useToast } from "@/components/ui/toast";
import type { StoriesSetupData } from "@/lib/stories/setup";
import {
  DEFAULT_CEFR_LEVEL,
  DEFAULT_READING_LEVEL,
  type CefrLevel,
  type ReadingLevel,
  type Story,
  type StoryLevels,
  type StoryTerm,
} from "@/lib/stories/types";

const VOTE_MESSAGES: Record<string, string> = {
  "1": "Liked. You'll get more stories in this style.",
  "-1": "Got it. You'll get fewer stories in this style.",
  null: "Vote removed.",
};

type StoryStep = "setup" | "generating" | "reading" | "error";

const DEFAULT_LEVELS: StoryLevels = {
  readingLevel: DEFAULT_READING_LEVEL,
  cefrLevel: DEFAULT_CEFR_LEVEL,
};

export function useStorySession(setup: StoriesSetupData) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<StoryStep>(setup.currentStory ? "reading" : "setup");
  const [domainId, setDomainId] = useState(setup.initialDomainId);
  const [levelsByDomain, setLevelsByDomain] = useState(setup.levelsByDomain);
  const initialLevels =
    (setup.initialDomainId && setup.levelsByDomain[setup.initialDomainId]) || DEFAULT_LEVELS;
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>(initialLevels.readingLevel);
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(initialLevels.cefrLevel);
  const [outline, setOutline] = useState("");
  const [story, setStory] = useState<Story | null>(setup.currentStory?.story ?? null);
  const [terms, setTerms] = useState<StoryTerm[]>(setup.currentStory?.terms ?? []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const busyRef = useRef(false);

  function selectCollection(nextDomainId: string) {
    setDomainId(nextDomainId);
    const levels = levelsByDomain[nextDomainId] ?? DEFAULT_LEVELS;
    setReadingLevel(levels.readingLevel);
    setCefrLevel(levels.cefrLevel);
  }

  function showStory(result: Extract<StoryResult, { story: Story }>) {
    setStory(result.story);
    setTerms(result.terms);
    setErrorMessage(null);
    setStep("reading");
  }

  async function generate() {
    if (busyRef.current || !domainId) return;
    busyRef.current = true;
    setStep("generating");
    setErrorMessage(null);

    const levels = { readingLevel, cefrLevel };
    const result = await generateStoryAction({ domainId, ...levels, outline });
    busyRef.current = false;

    if ("error" in result) {
      setErrorMessage(result.error);
      setStep("error");
      return;
    }
    setLevelsByDomain((current) => ({ ...current, [domainId]: levels }));
    setOutline("");
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
    const result = await voteStoryAction(story.id, next);
    if (result.error) {
      setStory((current) => (current ? { ...current, vote: previous } : current));
      toast(result.error, "destructive");
      return;
    }
    toast(VOTE_MESSAGES[String(next)]!);
  }

  async function dismiss() {
    if (!story) return;
    const result = await dismissStoryAction(story.id);
    if (result.error) {
      toast(result.error, "destructive");
      return;
    }
    setStory(null);
    setTerms([]);
    backToSetup();
  }

  function backToSetup() {
    setErrorMessage(null);
    setStep("setup");
    router.refresh();
  }

  return {
    step,
    domainId,
    selectCollection,
    readingLevel,
    setReadingLevel,
    cefrLevel,
    setCefrLevel,
    outline,
    setOutline,
    story,
    terms,
    errorMessage,
    isMarkingRead,
    generate,
    markRead,
    vote,
    backToSetup,
    dismiss,
  };
}

export type StorySession = ReturnType<typeof useStorySession>;
