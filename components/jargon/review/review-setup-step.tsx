import {
  countTermsForSelection,
  getMaxStudyCount,
  studyCountPresetValues,
} from "@/lib/study/count";
import { type StudyCollection } from "@/lib/study/types";
import { QuizPanel, QuizPanelLabel, QuizStat } from "@/components/jargon/quiz/quiz-ui";
import {
  StudyCollectionField,
  StudyCountField,
  StudyNoActiveCollectionsState,
  StudyResumeBanner,
  StudySetupPanel,
} from "@/components/jargon/study/study-setup-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import type { ReviewSessionState } from "@/lib/review/types";
import { cn } from "@/lib/utils";

function ReviewPoolBreakdown({
  stats,
}: {
  stats: {
    unseen: number;
    seen: number;
    total: number;
  } | null;
}) {
  const unseen = stats?.unseen ?? 0;
  const seen = stats?.seen ?? 0;
  const total = stats?.total ?? 0;

  return (
    <p
      className={cn(
        "mt-1 mb-0 line-clamp-2 min-h-[2lh] text-xs font-normal leading-snug text-base-content/70",
        !stats && "invisible",
      )}
      aria-hidden={!stats}
    >
      <span className="font-medium tabular-nums">{unseen}</span> never reviewed
      {" · "}
      <span className="font-medium tabular-nums">{seen}</span> reviewed
      {" · "}
      <span className="font-medium tabular-nums">
        {seen}/{total}
      </span>{" "}
      covered
    </p>
  );
}

type ReviewSetupStepProps = {
  collections: StudyCollection[];
  selectedCollectionId: string;
  onSelectedCollectionIdChange: (value: string) => void;
  cardCount: number;
  cardCountInput: string;
  cardCountError: string | null;
  onCardCountInputChange: (value: string) => void;
  onApplyCardCount: (value: number) => void;
  poolStats: {
    unseen: number;
    seen: number;
    total: number;
  } | null;
  savedSession: ReviewSessionState | null;
  onResumeSession: () => void;
  onDiscardSession: () => void;
  errorMessage: string | null;
  isStarting: boolean;
  onStartReview: () => void;
};

export function ReviewSetupStep({
  collections,
  selectedCollectionId,
  onSelectedCollectionIdChange,
  cardCount,
  cardCountInput,
  cardCountError,
  onCardCountInputChange,
  onApplyCardCount,
  poolStats,
  savedSession,
  onResumeSession,
  onDiscardSession,
  errorMessage,
  isStarting,
  onStartReview,
}: ReviewSetupStepProps) {
  const domainIds = selectedCollectionId === "all" ? "all" : [selectedCollectionId];
  const availableTermCount = countTermsForSelection(collections, domainIds);
  const maxCardCount = getMaxStudyCount(availableTermCount);
  const cardCountPresets = studyCountPresetValues(maxCardCount);

  return (
    <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
      {collections.length === 0 ? (
        <StudyNoActiveCollectionsState description="Turn on a collection on the collection page before you start reviewing." />
      ) : (
        <StudySetupPanel
          footer={
            <Button
              type="button"
              onPress={onStartReview}
              isDisabled={availableTermCount === 0 || isStarting || cardCountError !== null}
              className="min-h-11 w-full"
            >
              {isStarting ? "Starting…" : "Start review"}
            </Button>
          }
        >
          <QuizPanelLabel
            title="Set up your review"
            description="Pick what to study and how many terms."
          />
          {savedSession ? (
            <StudyResumeBanner
              message={
                <>
                  You have an in-progress session — term{" "}
                  <span className="tabular-nums">{savedSession.currentIndex + 1}</span> of{" "}
                  <span className="tabular-nums">{savedSession.cards.length}</span>.
                </>
              }
              onResume={onResumeSession}
              onDiscard={onDiscardSession}
            />
          ) : null}

          <StudyCollectionField
            id="review-collection"
            collections={collections}
            value={selectedCollectionId}
            onChange={onSelectedCollectionIdChange}
          />

          <QuizStat
            value={
              <>
                {availableTermCount === 1
                  ? "1 term available"
                  : `${availableTermCount} terms available`}
                <ReviewPoolBreakdown stats={poolStats} />
              </>
            }
          />

          <StudyCountField
            id="review-term-count"
            label="How many terms"
            presets={cardCountPresets}
            selectedValue={cardCount}
            inputValue={cardCountInput}
            error={cardCountError}
            max={maxCardCount}
            availableCount={availableTermCount}
            perUnitLabel="session"
            onPresetSelect={onApplyCardCount}
            onInputChange={onCardCountInputChange}
          />

          {availableTermCount === 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                No terms in your selection. Pick another collection or{" "}
                <LinkButton href="/jargon" variant="link" className="h-auto min-h-0 p-0">
                  activate one
                </LinkButton>
                .
              </AlertDescription>
            </Alert>
          ) : null}

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </StudySetupPanel>
      )}
    </QuizPanel>
  );
}
