"use client";

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
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
    <Alert>
      <AlertDescription>
        <p className="m-0 font-medium">{pluralize(terms.length, "term")} to finish</p>
        <p className="m-0 text-base-content/60">
          They stay out of Read, Review and Quiz until they have a definition.
        </p>
      </AlertDescription>
      <AlertAction>
        <Button type="button" size="sm" className="min-h-11 md:min-h-8" onPress={onFinish}>
          Finish {pluralize(terms.length, "term")}
        </Button>
        {requestHref ? (
          <LinkButton
            href={requestHref}
            size="sm"
            variant="outline"
            className="min-h-11 md:min-h-8"
          >
            {REQUEST_COPY.definitions.link}
          </LinkButton>
        ) : null}
      </AlertAction>
    </Alert>
  );
}
