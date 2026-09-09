import Link from "next/link";
import { DebugCollectionSelect } from "@/components/jargon/debug/debug-collection-select";
import { QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";
import type { PickContext } from "@/lib/trace-queue";
import type { StudyCollection } from "@/lib/study/types";
import { cn } from "@/lib/utils";

const CONTEXT_OPTIONS: Array<{
  value: PickContext;
  title: string;
  description: string;
}> = [
  {
    value: "read",
    title: "Read",
    description:
      "Read page/command priority — ranked by decay-aware exposure combining Read/Review/Quiz history, tempered by how well-tested the term already is.",
  },
  {
    value: "review",
    title: "Review",
    description: "Flashcard review priority — ranked by recall retrievability R_r(t) ascending.",
  },
  {
    value: "quiz",
    title: "Quiz",
    description: "Quiz priority — ranked by recognition retrievability R_g(t) ascending.",
  },
];

export function debugQueueHref({ context, domainId }: { context: PickContext; domainId: string }) {
  const params = new URLSearchParams();
  if (context !== "review") params.set("context", context);
  if (domainId !== "all") params.set("domain", domainId);
  const query = params.toString();
  return query ? `/jargon/debug?${query}` : "/jargon/debug";
}

export function debugViewHref({
  view,
  context,
  domainId,
}: {
  view: "queue" | "calibration";
  context: PickContext;
  domainId: string;
}) {
  const params = new URLSearchParams();
  if (view !== "queue") params.set("view", view);
  if (context !== "review") params.set("context", context);
  if (domainId !== "all") params.set("domain", domainId);
  const query = params.toString();
  return query ? `/jargon/debug?${query}` : "/jargon/debug";
}

/** Compact toolbar: which tier ranks these terms (Read/Review/Quiz, as a
 *  segmented control) and which collection to scope to, side by side —
 *  replaces the old stacked full-height radio list, which spent three rows
 *  of always-visible description text to show one active selection. Only
 *  the selected tier's ranking rule is shown, as a single caption line. */
export function QueueFilters({
  context,
  domainId,
  collections,
}: {
  context: PickContext;
  domainId: string;
  collections: StudyCollection[];
}) {
  const selected =
    CONTEXT_OPTIONS.find((option) => option.value === context) ?? CONTEXT_OPTIONS[1]!;

  return (
    <QuizPanel>
      <QuizPanelBody className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" className="tabs tabs-box tabs-sm w-full sm:w-auto">
            {CONTEXT_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={debugQueueHref({ context: option.value, domainId })}
                scroll={false}
                role="tab"
                aria-selected={context === option.value}
                className={cn(
                  "tab grow no-underline sm:grow-0",
                  context === option.value && "tab-active",
                )}
              >
                {option.title}
              </Link>
            ))}
          </div>
          <div className="w-full sm:w-64">
            <DebugCollectionSelect
              collections={collections}
              domainId={domainId}
              context={context}
            />
          </div>
        </div>
        <p className="m-0 text-xs text-base-content/50">{selected.description}</p>
      </QuizPanelBody>
    </QuizPanel>
  );
}
