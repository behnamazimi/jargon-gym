import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { DebugScoredRow, DebugStrengthRow } from "@/app/(private)/jargon/debug/actions";
import type { DebugView } from "@/app/(private)/jargon/debug/page";
import { ScoreRows } from "@/components/jargon/debug/score-rows";
import { StrengthRows } from "@/components/jargon/debug/strength-rows";
import { QuizCenteredState, QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PickContext } from "@/lib/smart-queue/types";
import type { StudyCollection, TermPoolStatus } from "@/lib/study/types";
import { cn } from "@/lib/utils";

type DebugQueuePageProps = {
  collections: StudyCollection[];
  view: DebugView;
  status: TermPoolStatus;
  context: PickContext;
  domainId: string;
  rows: DebugScoredRow[];
  strengthRows: DebugStrengthRow[];
  errorMessage: string | null;
};

const VIEW_OPTIONS: Array<{ value: DebugView; title: string; description: string }> = [
  {
    value: "strength",
    title: "Strength",
    description: "Blended overall mastery per term — same score shown on collection cards.",
  },
  {
    value: "queue",
    title: "Smart-queue scoring",
    description: "Ranked pick order for one context — score, reasons, per-activity streaks.",
  },
];

const CONTEXT_OPTIONS: Array<{
  value: PickContext;
  title: string;
  description: string;
}> = [
  {
    value: "read",
    title: "Read",
    description: "Read page/command priority — no pass/fail concept, just read exposure.",
  },
  {
    value: "review",
    title: "Review",
    description: "Flashcard review priority — scored against review_streak.",
  },
  {
    value: "quiz",
    title: "Quiz",
    description: "Quiz priority — scored against quiz_streak, independent of Review.",
  },
];

function debugQueueHref({
  view,
  status,
  context,
  domainId,
}: {
  view: DebugView;
  status: TermPoolStatus;
  context: PickContext;
  domainId: string;
}) {
  const params = new URLSearchParams();
  if (view !== "queue") params.set("view", view);
  if (view === "queue") {
    if (status !== "unknown") params.set("status", status);
    if (context !== "review") params.set("context", context);
  }
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
  view,
  status,
  context,
  domainId,
  rows,
  strengthRows,
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
            <legend className="mb-2 text-sm leading-none font-medium">View</legend>
            <div className="flex flex-col gap-3">
              {VIEW_OPTIONS.map((option) => (
                <DebugFilterLink
                  key={option.value}
                  href={debugQueueHref({ view: option.value, status, context, domainId })}
                  selected={view === option.value}
                  title={option.title}
                  description={option.description}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-sm leading-none font-medium">Collection</legend>
            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
              <DebugFilterLink
                href={debugQueueHref({ view, status, context, domainId: "all" })}
                selected={domainId === "all"}
                title="All active collections"
                description="Score every term in collections that are turned on."
              />
              {collections.map((collection) => (
                <DebugFilterLink
                  key={collection.id}
                  href={debugQueueHref({ view, status, context, domainId: collection.id })}
                  selected={domainId === collection.id}
                  title={collection.name}
                  description={`${collection.unknownCount} unknown · ${collection.knownCount} known`}
                />
              ))}
            </div>
          </fieldset>

          {view === "queue" ? (
            <>
              <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
                <legend className="mb-2 text-sm leading-none font-medium">Context</legend>
                <div className="flex flex-col gap-3">
                  {CONTEXT_OPTIONS.map((option) => (
                    <DebugFilterLink
                      key={option.value}
                      href={debugQueueHref({ view, status, context: option.value, domainId })}
                      selected={context === option.value}
                      title={option.title}
                      description={option.description}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
                <legend className="mb-2 text-sm leading-none font-medium">Pool</legend>
                <div className="flex flex-col gap-3">
                  {context === "quiz" ? (
                    <p className="m-0 text-xs text-base-content/60">
                      Quiz is known-pool only — unknown terms aren&apos;t inspectable here.
                    </p>
                  ) : (
                    <DebugFilterLink
                      href={debugQueueHref({ view, status: "unknown", context, domainId })}
                      selected={status === "unknown"}
                      title="Unknown terms"
                      description="Terms you haven't marked as known."
                    />
                  )}
                  <DebugFilterLink
                    href={debugQueueHref({ view, status: "known", context, domainId })}
                    selected={status === "known"}
                    title="Known terms"
                    description="Terms you've already marked as known."
                  />
                </div>
              </fieldset>
            </>
          ) : null}
        </QuizPanelBody>
      </QuizPanel>

      <QuizPanel>
        <QuizPanelBody>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : view === "strength" ? (
            <StrengthRows rows={strengthRows} />
          ) : (
            <ScoreRows rows={rows} context={context} />
          )}
        </QuizPanelBody>
      </QuizPanel>
    </>
  );
}
