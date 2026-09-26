"use client";

import { KeyRound } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CollectionSelect,
  type CollectionSelectOption,
} from "@/components/jargon/collection-select";
import { QuizPanelLabel } from "@/components/jargon/quiz/quiz-ui";
import { StudySetupPanel } from "@/components/jargon/study/study-setup-panel";
import type { StoryCollection } from "@/lib/stories/setup";
import type { StorySession } from "@/components/jargon/read/stories/use-story-session";
import {
  CEFR_LEVELS,
  READING_LEVELS,
  STORY_MAX_TERMS,
  STORY_MIN_TERMS,
  STORY_OUTLINE_MAX,
  type CefrLevel,
  type ReadingLevel,
} from "@/lib/stories/types";
import { cn } from "@/lib/utils";

const READING_LEVEL_LABELS: Record<ReadingLevel, { label: string; hint: string }> = {
  plain: { label: "Plain", hint: "Everyday prose; context carries the meaning." },
  professional: { label: "Professional", hint: "Like a colleague's write-up." },
  expert: { label: "Expert", hint: "Dense and technical; assumes background." },
};

const CEFR_HINTS: Record<CefrLevel, string> = {
  A2: "A2 · simple sentences",
  B1: "B1 · clear, common words",
  B2: "B2 · varied, everyday fluent",
  C1: "C1 · complex and idiomatic",
  C2: "C2 · native-level nuance",
};

function collectionLabel(collection: CollectionSelectOption) {
  const count = collection.termCount ?? 0;
  return count < STORY_MIN_TERMS
    ? `${collection.name} (needs ${STORY_MIN_TERMS}+ terms)`
    : `${collection.name} (${count})`;
}

function ReadingLevelField({
  value,
  onChange,
}: {
  value: ReadingLevel;
  onChange: (level: ReadingLevel) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-medium leading-none">Reading level</legend>
      <div className="flex gap-2">
        {READING_LEVELS.map((level) => (
          <Button
            key={level}
            type="button"
            variant="outline"
            onPress={() => onChange(level)}
            aria-pressed={value === level}
            className={cn(
              "min-h-11 flex-1 px-2",
              value === level && "border-primary bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            {READING_LEVEL_LABELS[level].label}
          </Button>
        ))}
      </div>
      <p className="m-0 text-xs leading-relaxed text-base-content/60">
        {READING_LEVEL_LABELS[value].hint}
      </p>
    </fieldset>
  );
}

function CefrLevelField({
  value,
  onChange,
}: {
  value: CefrLevel;
  onChange: (level: CefrLevel) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="story-cefr">Language level</FieldLabel>
      <Select
        value={value}
        onChange={(key) => {
          if (key != null) onChange(key as CefrLevel);
        }}
        className="w-full"
      >
        <SelectTrigger id="story-cefr" size="sm" className="w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CEFR_LEVELS.map((level) => (
            <SelectItem key={level} id={level}>
              {CEFR_HINTS[level]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>How complex the sentences and everyday words are.</FieldDescription>
    </Field>
  );
}

function OutlineField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor="story-outline">Outline (optional)</FieldLabel>
      <Textarea
        id="story-outline"
        value={value}
        maxLength={STORY_OUTLINE_MAX}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. A late-night outage at a small startup"
        className="min-h-20 text-sm"
      />
      <FieldDescription className="flex justify-between gap-2">
        <span>Sets the topic. Terms still come from your queue.</span>
        <span className="tabular-nums">
          {value.length}/{STORY_OUTLINE_MAX}
        </span>
      </FieldDescription>
    </Field>
  );
}

function NoLlmAlert() {
  return (
    <Alert variant="destructive">
      <KeyRound className="size-4" aria-hidden strokeWidth={1.5} />
      <AlertDescription>
        Stories are written with your own AI provider. Add a provider and API key in Settings.
      </AlertDescription>
      <AlertAction>
        <LinkButton href="/jargon/settings" size="sm" variant="outline" className="max-md:min-h-11">
          Go to Settings
        </LinkButton>
      </AlertAction>
    </Alert>
  );
}

export function StorySetupPanel({
  session,
  collections,
  llmConfigured,
  providerLabel,
}: {
  session: StorySession;
  collections: StoryCollection[];
  llmConfigured: boolean;
  providerLabel: string | null;
}) {
  const selected = collections.find((collection) => collection.id === session.domainId);
  const eligibleCount = selected?.eligibleCount ?? 0;
  const canGenerate = llmConfigured && eligibleCount >= STORY_MIN_TERMS;
  const termCount = Math.min(eligibleCount, STORY_MAX_TERMS);

  return (
    <StudySetupPanel
      footer={
        <Button
          type="button"
          onPress={() => void session.generate()}
          isDisabled={!canGenerate}
          className="min-h-11 w-full"
        >
          Write a story
        </Button>
      }
      footerHint={
        canGenerate
          ? `Uses ${termCount} terms from this collection${providerLabel ? ` · written by ${providerLabel}` : ""}.`
          : undefined
      }
    >
      <QuizPanelLabel
        title="Set up your story"
        description="A short piece of reading built around the next terms in your Read queue. Mark it read to count a read for every term in it."
      />

      {llmConfigured ? null : <NoLlmAlert />}

      <Field>
        <FieldLabel htmlFor="story-collection">Collection</FieldLabel>
        <CollectionSelect
          mode="local"
          id="story-collection"
          size="sm"
          triggerClassName="text-sm"
          collections={collections.map((collection) => ({
            id: collection.id,
            name: collection.name,
            termCount: collection.eligibleCount,
          }))}
          value={session.domainId ?? ""}
          disabledKeys={collections
            .filter((collection) => collection.eligibleCount < STORY_MIN_TERMS)
            .map((collection) => collection.id)}
          labelFor={collectionLabel}
          onChange={session.selectCollection}
        />
      </Field>

      <ReadingLevelField value={session.readingLevel} onChange={session.setReadingLevel} />
      <CefrLevelField value={session.cefrLevel} onChange={session.setCefrLevel} />
      <OutlineField value={session.outline} onChange={session.setOutline} />
    </StudySetupPanel>
  );
}
