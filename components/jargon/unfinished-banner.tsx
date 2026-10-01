"use client";

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/utils";
import type { UnfinishedTerm } from "@/lib/jargon/types";

type UnfinishedBannerProps = {
  terms: UnfinishedTerm[];
  onFinish: () => void;
};

/** Owner-only prompt for terms that are saved but still need a definition. */
export function UnfinishedBanner({ terms, onFinish }: UnfinishedBannerProps) {
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
      </AlertAction>
    </Alert>
  );
}
