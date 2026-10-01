"use client";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { REQUEST_COPY } from "@/lib/requests/copy";
import { pluralize } from "@/lib/utils";
import type { UnfinishedTerm } from "@/lib/jargon/types";

type UnfinishedBannerProps = {
  terms: UnfinishedTerm[];
  onFinish: () => void;
  /** Where to ask for definitions, when that's possible right now. */
  requestHref?: string;
};

/** Owner-only prompt for terms that are saved but still need a definition. */
export function UnfinishedBanner({ terms, onFinish, requestHref }: UnfinishedBannerProps) {
  if (terms.length === 0) return null;

  return (
    <Alert variant="warning">
      <AlertTitle>{pluralize(terms.length, "term")} to finish</AlertTitle>
      <AlertDescription>
        They stay out of Read, Review and Quiz until they have a definition.
      </AlertDescription>
      <AlertAction>
        <Button type="button" size="sm" onPress={onFinish}>
          Finish {pluralize(terms.length, "term")}
        </Button>
        {requestHref ? (
          <LinkButton href={requestHref} size="sm" variant="outline">
            {REQUEST_COPY.definitions.link}
          </LinkButton>
        ) : null}
      </AlertAction>
    </Alert>
  );
}
