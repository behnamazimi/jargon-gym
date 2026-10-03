"use client";

import { ArrowRight } from "lucide-react";
import { use, useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { clearDraft } from "@/lib/import/draft-store";
import { pluralize } from "@/lib/utils";
import { dropSearchParamFromUrl } from "@/components/library/library-page-helpers";

export type ImportedSummary = {
  domainId: string;
  domainName: string;
  created: number;
  updated: number;
  skipped: number;
  unfinished: number;
  relationshipsDropped: number;
};

/** Holds the confirmation for the import that just landed, and drops ?added=
 *  so a reload or shared link doesn't repeat it. The pasted list is only
 *  cleared once the import is known to have worked. */
function useImportedNotice(summary: ImportedSummary | undefined) {
  const [dismissed, setDismissed] = useState(false);
  useMountEffect(() => {
    if (!summary) return;
    dropSearchParamFromUrl("added");
    clearDraft();
  });
  return { summary: dismissed ? undefined : summary, dismiss: () => setDismissed(true) };
}

function detailLine(summary: ImportedSummary) {
  const parts: string[] = [];
  if (summary.unfinished > 0) parts.push(`${summary.unfinished} to finish later`);
  if (summary.skipped > 0) parts.push(`Skipped ${summary.skipped} already in this collection`);
  if (summary.updated > 0 && summary.created > 0) parts.push(`Updated ${summary.updated}`);
  if (summary.relationshipsDropped > 0)
    parts.push(`${pluralize(summary.relationshipsDropped, "link")} left out`);
  return parts.join(" · ");
}

/** One-time confirmation after an import lands on its collection. The
 *  server loads the summary in parallel and passes the promise; wrap this in
 *  <Suspense> so the list never waits for it. */
export function ImportedNotice({
  summary: summaryPromise,
  domain,
  onFinish,
}: {
  summary: Promise<ImportedSummary | undefined>;
  domain: { id: string; name: string };
  onFinish: () => void;
}) {
  const notice = useImportedNotice(use(summaryPromise));
  return (
    <ImportedBanner
      summary={notice.summary}
      domain={domain}
      onFinish={onFinish}
      onDismiss={notice.dismiss}
    />
  );
}

function ImportedBanner({
  summary,
  domain,
  onFinish,
  onDismiss,
}: {
  summary: ImportedSummary | undefined;
  domain: { id: string; name: string };
  onFinish: () => void;
  onDismiss: () => void;
}) {
  if (!summary || summary.domainId !== domain.id) return null;

  const addedAny = summary.created > 0;
  const title = addedAny
    ? `Added ${pluralize(summary.created, "term")} to ${summary.domainName}`
    : `Updated ${pluralize(summary.updated, "term")} in ${summary.domainName}`;
  const studyable = summary.created - summary.unfinished + summary.updated > 0;
  const details = detailLine(summary);

  return (
    <Alert variant="success" onDismiss={onDismiss}>
      <AlertTitle>{title}</AlertTitle>
      {details ? <AlertDescription>{details}</AlertDescription> : null}
      <AlertAction className="flex-row flex-wrap items-center max-md:[&>*]:min-h-0">
        {studyable ? (
          <LinkButton href={`/app/read?domain=${domain.id}`} size="sm" className="gap-2">
            Start reading
            <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
          </LinkButton>
        ) : null}
        {studyable ? (
          <LinkButton href={`/app/triage?domain=${domain.id}`} size="sm" variant="outline">
            Mark what you know
          </LinkButton>
        ) : null}
        {summary.unfinished > 0 ? (
          <Button type="button" size="sm" variant="outline" onPress={onFinish}>
            Finish {pluralize(summary.unfinished, "term")}
          </Button>
        ) : null}
      </AlertAction>
    </Alert>
  );
}
