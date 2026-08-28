import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { DebugReviewMixInfo, DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { DebugCollectionSelect } from "@/components/jargon/debug/debug-collection-select";
import { RotationInsightPanel } from "@/components/jargon/debug/rotation-insight-panel";
import { ScoreRows } from "@/components/jargon/debug/score-rows";
import { QuizCenteredState, QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RotationPoolInsight } from "@/lib/smart-queue/rotation-insight";
import type { PickContext } from "@/lib/smart-queue/types";
import type { StudyCollection } from "@/lib/study/types";
import { cn } from "@/lib/utils";

type DebugQueuePageProps = {
  collections: StudyCollection[];
  context: PickContext;
  domainId: string;
  rows: DebugScoredRow[];
  mix: DebugReviewMixInfo | null;
  insight: RotationPoolInsight[];
  /** Read only: unknown pool was empty, so these rows are the known-pool
   *  stale-known fallback (read_mode === "stale_known") instead. */
  readFallbackActive: boolean;
  errorMessage: string | null;
};

const CONTEXT_OPTIONS: Array<{
  value: PickContext;
  title: string;
  description: string;
}> = [
  {
    value: "read",
    title: "Read",
    description:
      "Read page/command priority — unknown pool first, no pass/fail concept. Falls back to a known-pool staleness order once the unknown pool is empty, if Read settings has known-term fallback on.",
  },
  {
    value: "review",
    title: "Review",
    description: "Flashcard review priority — blends known + unknown pools.",
  },
  {
    value: "quiz",
    title: "Quiz",
    description: "Quiz priority — known pool only, independent of Review.",
  },
];

export function debugQueueHref({ context, domainId }: { context: PickContext; domainId: string }) {
  const params = new URLSearchParams();
  if (context !== "review") params.set("context", context);
  if (domainId !== "all") params.set("domain", domainId);
  const query = params.toString();
  return query ? `/jargon/debug?${query}` : "/jargon/debug";
}

function DebugFilterLink({
  href,
  selected,
  title,
  description,
}: {
  href: string;
  selected: boolean;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 py-1 no-underline"
      aria-current={selected ? "true" : undefined}
    >
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
          selected ? "border-primary" : "border-base-content/40",
        )}
        aria-hidden
      >
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-none font-medium">{title}</span>
        <span className="mt-1.5 block text-xs leading-relaxed text-base-content/60">
          {description}
        </span>
      </span>
    </Link>
  );
}

export function DebugQueuePage({
  collections,
  context,
  domainId,
  rows,
  mix,
  insight,
  readFallbackActive,
  errorMessage,
}: DebugQueuePageProps) {
  if (collections.length === 0) {
    return (
      <QuizPanel>
        <QuizPanelBody>
          <QuizCenteredState
            icon={AlertCircle}
            title="No active collections"
            description="Turn on a collection on the collection page to see its terms here."
          />
        </QuizPanelBody>
      </QuizPanel>
    );
  }

  return (
    <>
      <QuizPanel>
        <QuizPanelBody>
          <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-sm leading-none font-medium">Context</legend>
            <div className="flex flex-col gap-3">
              {CONTEXT_OPTIONS.map((option) => (
                <DebugFilterLink
                  key={option.value}
                  href={debugQueueHref({ context: option.value, domainId })}
                  selected={context === option.value}
                  title={option.title}
                  description={option.description}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-sm leading-none font-medium">Collection</legend>
            <DebugCollectionSelect
              collections={collections}
              domainId={domainId}
              context={context}
            />
          </fieldset>

          {context === "review" ? (
            <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-sm leading-none font-medium">Mix</legend>
              {mix ? (
                <p className="m-0 text-xs text-base-content/60">
                  Configured ratio: {mix.knownSlots}:{mix.unknownSlots} known:unknown — this view:{" "}
                  {mix.knownCount} known / {mix.unknownCount} unknown.
                </p>
              ) : (
                <p className="m-0 text-xs text-base-content/60">No terms in either pool.</p>
              )}
            </fieldset>
          ) : null}

          {context === "read" && readFallbackActive ? (
            <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-sm leading-none font-medium">Fallback</legend>
              <p className="m-0 text-xs text-base-content/60">
                Unknown pool is empty. Read settings has known-term fallback on, so these rows are
                the known pool ordered by staleness instead — not scored, no reasons.
              </p>
            </fieldset>
          ) : null}
        </QuizPanelBody>
      </QuizPanel>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <>
          <RotationInsightPanel pools={insight} />
          <ScoreRows rows={rows} context={context} />
        </>
      )}
    </>
  );
}
