"use client";

import { AlertCircle, Bug } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  listDebugScoredTermsAction,
  type DebugScoredRow,
} from "@/app/(private)/jargon/debug/actions";
import { ScoreRows } from "@/components/jargon/debug/score-rows";
import { PageHeader } from "@/components/jargon/page-header";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizSetupOption,
} from "@/components/jargon/quiz/quiz-ui";
import { PageShell } from "@/components/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PickContext } from "@/lib/smart-queue";
import type { StudyCollection, TermPoolStatus } from "@/lib/study";

type DebugQueuePageProps = {
  collections: StudyCollection[];
};

const CONTEXT_OPTIONS: Array<{ value: PickContext; title: string; description: string }> = [
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

export function DebugQueuePage({ collections }: DebugQueuePageProps) {
  const [status, setStatus] = useState<TermPoolStatus>("unknown");
  const [selectedCollectionId, setSelectedCollectionId] = useState("all");
  const [context, setContext] = useState<PickContext>("review");
  const [rows, setRows] = useState<DebugScoredRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const domainIds = useMemo(
    (): string[] | "all" => (selectedCollectionId === "all" ? "all" : [selectedCollectionId]),
    [selectedCollectionId],
  );

  useEffect(() => {
    if (collections.length === 0) return;

    let cancelled = false;
    setLoading(true);

    void listDebugScoredTermsAction(domainIds, status, context).then((result) => {
      if (cancelled) return;
      setLoading(false);

      if (result.error) {
        setErrorMessage(result.error);
        setRows([]);
      } else {
        setErrorMessage(null);
        setRows(result.rows ?? []);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [domainIds, status, context, collections.length]);

  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Bug}
        title="Queue debug"
        description="Every term's smart-queue score and signals — for debugging the ranking, not for studying."
      />

      {collections.length === 0 ? (
        <QuizPanel>
          <QuizPanelBody>
            <QuizCenteredState
              icon={AlertCircle}
              title="No active collections"
              description="Turn on a collection on the collection page to see its terms here."
            >
              <LinkButton href="/jargon">Back to collection</LinkButton>
            </QuizCenteredState>
          </QuizPanelBody>
        </QuizPanel>
      ) : (
        <>
          <QuizPanel>
            <QuizPanelHeader
              icon={Bug}
              title="Filters"
              description="Nothing here saves anywhere — switch context freely to compare rankings."
            />
            <QuizPanelBody>
              <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
                <legend className="mb-2 text-sm leading-none font-medium">Pool</legend>
                <div className="flex flex-col gap-3">
                  <QuizSetupOption
                    name="debug-status"
                    value="unknown"
                    checked={status === "unknown"}
                    onChange={() => setStatus("unknown")}
                    title="Unknown terms"
                    description="Terms you haven't marked as known."
                  />
                  <QuizSetupOption
                    name="debug-status"
                    value="known"
                    checked={status === "known"}
                    onChange={() => setStatus("known")}
                    title="Known terms"
                    description="Terms you've already marked as known."
                  />
                </div>
              </fieldset>

              <Field className="max-w-md">
                <FieldLabel htmlFor="debug-collection">Collection</FieldLabel>
                <Select
                  selectedKey={selectedCollectionId}
                  onSelectionChange={(key) => setSelectedCollectionId(String(key))}
                >
                  <SelectTrigger id="debug-collection" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem id="all">All active collections</SelectItem>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} id={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
                <legend className="mb-2 text-sm leading-none font-medium">Context</legend>
                <div className="flex flex-col gap-3">
                  {CONTEXT_OPTIONS.map((option) => (
                    <QuizSetupOption
                      key={option.value}
                      name="debug-context"
                      value={option.value}
                      checked={context === option.value}
                      onChange={() => setContext(option.value)}
                      title={option.title}
                      description={option.description}
                    />
                  ))}
                </div>
              </fieldset>
            </QuizPanelBody>
          </QuizPanel>

          <QuizPanel>
            <QuizPanelHeader
              icon={Bug}
              title={loading ? "Loading…" : `${rows.length} term${rows.length === 1 ? "" : "s"}`}
              description="Sorted by score, highest first — exactly what the queue would pick next."
            />
            <QuizPanelBody>
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : loading ? (
                <p className="m-0 text-sm text-base-content/60">Loading…</p>
              ) : (
                <ScoreRows rows={rows} context={context} />
              )}
            </QuizPanelBody>
          </QuizPanel>
        </>
      )}
    </PageShell>
  );
}
