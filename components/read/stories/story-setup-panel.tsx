"use client";

import { Button } from "@/components/ui/button";
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
} from "@/components/library/collection-select";
import { QuizPanelLabel } from "@/components/quiz/quiz-ui";
import { StudySetupPanel } from "@/components/read/study/study-setup-panel";
import type { StoryCollection } from "@/lib/stories/setup";
import type { StorySession } from "@/components/read/stories/use-story-session";
import {
  CEFR_LEVELS,
  STORY_MIN_TERMS,
  STORY_OUTLINE_MAX,
  type CefrLevel,
} from "@/lib/stories/types";
import { termsForLength } from "@/lib/stories/length";
import { aiAvailable, type AiAccessView } from "@/lib/llm/types";
import { storyCreditUse } from "@/lib/stories/credit-fit";
import { PieceLengthField, ReadingLevelField } from "@/components/read/stories/story-setup-fields";
import {
  StoryFooterHint,
  StoryNoAiNotice,
  StoryOverBalance,
} from "@/components/read/stories/story-setup-notices";

const CEFR_HINTS: Record<CefrLevel, string> = {
  A1: "A1 · very short, basic sentences",
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
    : `${collection.name} · ${count} to read`;
}

function CefrLevelField({
  value,
  onChange,
}: {
  value: CefrLevel;
  onChange: (level: CefrLevel) => void;
}) {
  return (
    <Field data-tour="stories-level">
      <FieldLabel htmlFor="story-cefr">Sentence difficulty</FieldLabel>
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
        className="min-h-8 text-sm"
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

export function StorySetupPanel({
  session,
  collections,
  ai,
}: {
  session: StorySession;
  collections: StoryCollection[];
  ai: AiAccessView;
}) {
  const selected = collections.find((collection) => collection.id === session.domainId);
  const eligibleCount = selected?.eligibleCount ?? 0;
  const termCount = Math.min(eligibleCount, termsForLength(session.pieceLength));
  const use = storyCreditUse(ai, session.pieceLength, eligibleCount);
  const hasEnoughTerms = eligibleCount >= STORY_MIN_TERMS;
  const canGenerate = aiAvailable(ai) && hasEnoughTerms && !use.overBalance;

  return (
    <StudySetupPanel
      footer={
        <Button
          type="button"
          data-tour="stories-write"
          onPress={() => void session.generate()}
          isDisabled={!canGenerate}
          className="min-h-11 w-full"
        >
          Write a story
        </Button>
      }
      footerHint={
        <StoryFooterHint ai={ai} use={use} termCount={termCount} hasEnoughTerms={hasEnoughTerms} />
      }
    >
      <QuizPanelLabel
        title="Set up your story"
        description="Mark it read to count a read for every term in it. A short piece built around the next terms in your Read queue."
      />

      <StoryNoAiNotice ai={ai} />

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
      <PieceLengthField
        value={session.pieceLength}
        termsAvailable={eligibleCount}
        onChange={session.setPieceLength}
      />
      <StoryOverBalance
        use={use}
        pieceLength={session.pieceLength}
        eligibleCount={eligibleCount}
        onFit={session.setPieceLength}
      />
      <OutlineField value={session.outline} onChange={session.setOutline} />
    </StudySetupPanel>
  );
}
