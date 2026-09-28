import { PartyPopper } from "lucide-react";
import {
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import { Button, LinkButton } from "@/components/ui/button";

type TriageSummaryProps = {
  domainId: string;
  domainName: string;
  markedCount: number;
  leftToLearnCount: number;
  hasNotYet: boolean;
  onRevisitNotYet: () => void;
};

export function TriageNextSteps({
  domainId,
  hasNotYet,
  onRevisitNotYet,
}: Pick<TriageSummaryProps, "domainId" | "hasNotYet" | "onRevisitNotYet">) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <LinkButton href={`/jargon/read?domain=${domainId}`}>Start reading</LinkButton>
      <LinkButton href={`/jargon?domain=${domainId}`} variant="outline">
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
  domainId,
  domainName,
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
        description={`You went through every term in ${domainName}.`}
      />
      <QuizPanelBody>
        <dl className="grid grid-cols-2 gap-2">
          <QuizStat label="Marked known" value={markedCount} variant="primary" />
          <QuizStat label="Left to learn" value={leftToLearnCount} />
        </dl>

        <TriageNextSteps
          domainId={domainId}
          hasNotYet={hasNotYet}
          onRevisitNotYet={onRevisitNotYet}
        />
      </QuizPanelBody>
    </QuizPanel>
  );
}
