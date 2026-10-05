"use client";

import { Suspense } from "react";
import type { ReviewTerm } from "@/lib/review/types";
import { TermBody, TermDefinition } from "./term-body";
import { TermLayoutCustomize } from "./term-layout-customize";
import { useTermLayoutScope } from "./term-layout-provider";

function LayoutAwareTermBody({ term }: { term: ReviewTerm }) {
  const scope = useTermLayoutScope(term.domainId);
  return (
    <TermBody
      term={term}
      language={term.domainLanguage}
      placement={scope?.placement}
      customize={scope ? <TermLayoutCustomize domainId={term.domainId} /> : undefined}
    />
  );
}

/** The term body on the study pages: it follows the learner's layout for the
 *  term's collection and offers Customize. The definition shows while the
 *  layout loads. Key it by term so More starts collapsed on every card. */
export function StudyTermBody({ term }: { term: ReviewTerm }) {
  return (
    <Suspense fallback={<TermDefinition term={term} />}>
      <LayoutAwareTermBody term={term} />
    </Suspense>
  );
}
