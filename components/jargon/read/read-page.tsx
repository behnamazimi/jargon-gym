"use client";

import { AlertCircle, ArrowRight, ExternalLink, PartyPopper, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import {
  getNextReadTermAction,
  type NextReadTermResult,
} from "@/app/(private)/jargon/read/actions";
import { PageHeader } from "@/components/jargon/page-header";
import {
  QuizActionBar,
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
} from "@/components/jargon/quiz/quiz-ui";
import { TermDetailSection } from "@/components/jargon/term-detail-section";
import { PageShell } from "@/components/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import type { ReviewTerm } from "@/lib/review/types";

type ReadStatus = "ready" | "caughtUp" | "error";

function statusFromResult(result: NextReadTermResult): ReadStatus {
  if (result.error) return "error";
  if (result.caughtUp || !result.term) return "caughtUp";
  return "ready";
}

type ReadPageProps = {
  initialResult: NextReadTermResult;
};

export function ReadPage({ initialResult }: ReadPageProps) {
  const [status, setStatus] = useState<ReadStatus>(() => statusFromResult(initialResult));
  const [term, setTerm] = useState<ReviewTerm | null>(initialResult.term ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialResult.error ?? null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const fetchNext = useCallback(async () => {
    setIsAdvancing(true);
    setErrorMessage(null);

    const result = await getNextReadTermAction();

    setIsAdvancing(false);

    if (result.error) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }

    if (result.caughtUp || !result.term) {
      setTerm(null);
      setStatus("caughtUp");
      return;
    }

    setTerm(result.term);
    setStatus("ready");
  }, []);

  const searchUrl = term
    ? `https://www.google.com/search?q=${encodeURIComponent(`${term.term} definition`)}`
    : "";

  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Zap}
        title="Read"
        description="One term at a time from your active collections — the same feed as /read on Telegram."
      />

      <div className="mx-auto w-full max-w-lg space-y-4">
        {status === "caughtUp" ? (
          <QuizPanel>
            <QuizPanelBody>
              <QuizCenteredState
                icon={PartyPopper}
                title="You're all caught up"
                description="No unknown terms left in your active collections. Import more terms or turn a collection back on to keep reading."
              >
                <div className="flex flex-wrap justify-center gap-2">
                  <LinkButton
                    href="/jargon"
                    className="transition-transform duration-150 ease-out active:scale-[0.96]"
                  >
                    Back to collection
                  </LinkButton>
                  <Button
                    variant="outline"
                    onPress={() => void fetchNext()}
                    className="transition-transform duration-150 ease-out active:scale-[0.96]"
                  >
                    Check again
                  </Button>
                </div>
              </QuizCenteredState>
            </QuizPanelBody>
          </QuizPanel>
        ) : null}

        {status === "ready" && term ? (
          <QuizPanel>
            <div className="border-b border-base-300/60 bg-primary/[0.04] px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading m-0 text-xl font-semibold tracking-tight text-base-content sm:text-2xl">
                    {term.term}
                  </h2>
                  <p className="mt-1 mb-0 text-xs text-base-content/50">{term.domainName}</p>
                </div>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {term.category}
                </Badge>
              </div>
            </div>
            <QuizPanelBody className="space-y-4">
              <p className="text-base leading-relaxed font-medium">{term.definition}</p>

              {term.example ? (
                <TermDetailSection label="Example" variant="callout">
                  {term.example}
                </TermDetailSection>
              ) : null}

              {term.mentalModel ? (
                <TermDetailSection label="Mental model" variant="callout">
                  {term.mentalModel}
                </TermDetailSection>
              ) : null}

              {term.discussion ? (
                <TermDetailSection label="In practice">{term.discussion}</TermDetailSection>
              ) : null}

              {term.antiExample ? (
                <TermDetailSection label="Anti-example" variant="debated">
                  {term.antiExample}
                </TermDetailSection>
              ) : null}

              {term.controversy ? (
                <TermDetailSection label="Debated" variant="debated">
                  {term.controversy}
                </TermDetailSection>
              ) : null}

              {term.relationships.length > 0 ? (
                <ul className="space-y-2">
                  {term.relationships.map((relationship) => (
                    <li
                      key={`${relationship.id}-${relationship.direction}`}
                      className="rounded-lg border border-dashed border-base-300/80 bg-base-200/30 px-3 py-2.5"
                    >
                      <p className="text-sm text-base-content/60">
                        <span className="italic">{relationship.relationshipType}</span>{" "}
                        <span className="font-semibold text-primary">
                          {relationship.relatedTermName}
                        </span>
                      </p>
                      {relationship.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-base-content/80">
                          {relationship.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              <a
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline transition-opacity duration-150 ease-out hover:underline"
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" aria-hidden strokeWidth={1.5} />
                Search &ldquo;{term.term}&rdquo; on Google
              </a>

              <QuizActionBar>
                <Button
                  type="button"
                  onPress={() => void fetchNext()}
                  isDisabled={isAdvancing}
                  className="ps-4 pe-3.5 transition-transform duration-150 ease-out active:scale-[0.96]"
                >
                  {isAdvancing ? "Loading…" : "Next term"}
                  <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
                </Button>
              </QuizActionBar>
            </QuizPanelBody>
          </QuizPanel>
        ) : null}

        {status === "error" ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden strokeWidth={1.5} />
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{errorMessage ?? "Couldn't load the next term. Try again."}</span>
              <Button
                type="button"
                size="sm"
                onPress={() => void fetchNext()}
                className="transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </PageShell>
  );
}
