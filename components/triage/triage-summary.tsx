import { PartyPopper } from "lucide-react";
import { QuizPanel, QuizPanelBody, QuizPanelHeader, QuizStat } from "@/components/quiz/quiz-ui";
import { Button, LinkButton } from "@/components/ui/button";

type TriageSummaryProps = {
  collectionId: string;
  collectionName: string;
  markedCount: number;
  leftToLearnCount: number;
  hasNotYet: boolean;
  onRevisitNotYet: () => void;
};

export function TriageNextSteps({
  collectionId,
  hasNotYet,
  onRevisitNotYet,
}: Pick<TriageSummaryProps, "collectionId" | "hasNotYet" | "onRevisitNotYet">) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <LinkButton href={`/app/read?collection=${collectionId}`}>Start reading</LinkButton>
      <LinkButton href={`/app/library?collection=${collectionId}`} variant="outline">
        Back to library
      </LinkButton>
      {hasNotYet ? (
        <Button type="button" variant="outline" onPress={onRevisitNotYet}>
          Go through &ldquo;Not yet&rdquo; again
        </Button>
      ) : null}
    </div>
  );
}

/** End of the deck: how it went, and where to go next. */
export function TriageSummary({
  collectionId,
  collectionName,
  markedCount,
  leftToLearnCount,
  hasNotYet,
  onRevisitNotYet,
}: TriageSummaryProps) {
  return (
    <QuizPanel>
      <QuizPanelHeader
        icon={PartyPopper}
        title="All sorted"
        description={`You went through every term in ${collectionName}.`}
      />
      <QuizPanelBody>
        <dl className="grid grid-cols-2 gap-2">
          <QuizStat label="Marked known" value={markedCount} variant="primary" />
          <QuizStat label="Left to learn" value={leftToLearnCount} />
        </dl>

        <TriageNextSteps
          collectionId={collectionId}
          hasNotYet={hasNotYet}
          onRevisitNotYet={onRevisitNotYet}
        />
      </QuizPanelBody>
    </QuizPanel>
  );
}
