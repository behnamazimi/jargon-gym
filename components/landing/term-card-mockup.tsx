"use client";

import { useEffect, useState } from "react";
import { QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { TermBody } from "@/components/jargon/term-body";
import type { Term } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";

type MockTerm = Term & { domainName: string };

// A pool spanning different fields, so the mock reads as one shared queue, not one collection.
const MOCK_TERMS: MockTerm[] = [
  {
    id: "burn-rate",
    domainName: "Startup jargon",
    category: "Finance",
    term: "Burn rate",
    definition: "How fast a company spends its cash reserves before running out of money.",
    mentalModel:
      "A bathtub draining, burn rate is the drain speed, runway is how long until it's empty.",
    example: "“At our burn rate, we have 14 months of runway left.”",
    antiExample: "Treating burn rate as total spend, it's net of revenue, not gross costs.",
    discussion: "Investors watch it alongside runway to gauge room before the next raise.",
    controversy: "Some argue gross burn matters more, since net burn hides revenue swings.",
    relationships: [
      {
        id: "burn-rate-runway",
        relationshipType: "Related to",
        description: "",
        direction: "outgoing",
        relatedTermId: "runway",
        relatedTermName: "Runway",
      },
    ],
  },
  {
    id: "statute-of-limitations",
    domainName: "Legal jargon",
    category: "Civil law",
    term: "Statute of limitations",
    definition:
      "The deadline after which a legal claim can no longer be filed, no matter how strong the case.",
    mentalModel: "A closing window, once it shuts, the courthouse door won't open for that claim.",
    example:
      "“The dispute happened six years ago, past the statute of limitations for this state.”",
    antiExample:
      "Assuming it means the claim is forgiven, it just means it can no longer be pursued.",
    discussion: "Lawyers check it first, since a case can be thrown out before the facts matter.",
    controversy:
      "Some argue certain claims, like abuse cases, shouldn't have a limitations period at all.",
    relationships: [
      {
        id: "statute-of-limitations-tolling",
        relationshipType: "Related to",
        description: "",
        direction: "outgoing",
        relatedTermId: "tolling",
        relatedTermName: "Tolling",
      },
    ],
  },
  {
    id: "escrow",
    domainName: "Real estate jargon",
    category: "Closing",
    term: "Escrow",
    definition: "Funds or documents held by a neutral third party until every condition is met.",
    mentalModel: "A holding pen, money sits there, untouchable by either side, until it's done.",
    example: "“The deposit is in escrow until the inspection clears.”",
    antiExample: "Assuming escrow means the deal is final, it just means the money's parked.",
    discussion: "Buyers and sellers rely on it so neither side has to trust the other with cash.",
    controversy: "Some argue escrow fees mostly protect the title company, not the parties.",
    relationships: [
      {
        id: "escrow-closing",
        relationshipType: "Related to",
        description: "",
        direction: "outgoing",
        relatedTermId: "closing",
        relatedTermName: "Closing",
      },
    ],
  },
  {
    id: "contraindication",
    domainName: "Medical jargon",
    category: "Pharmacology",
    term: "Contraindication",
    definition:
      "A specific situation where a drug or treatment could cause harm and shouldn't be used.",
    mentalModel:
      "A red flag on the label, a reason this specific patient shouldn't take this drug.",
    example: "“Pregnancy is a contraindication for that medication.”",
    antiExample:
      "Confusing it with a side effect, it's a reason to avoid the drug entirely, not just a risk.",
    discussion: "Doctors cross-check a patient's full history against it before prescribing.",
    controversy: "Some argue contraindication lists are overly cautious, based on rare edge cases.",
    relationships: [
      {
        id: "contraindication-side-effect",
        relationshipType: "Related to",
        description: "",
        direction: "outgoing",
        relatedTermId: "side-effect",
        relatedTermName: "Side effect",
      },
    ],
  },
  {
    id: "statistically-significant",
    domainName: "Academic jargon",
    category: "Statistics",
    term: "Statistically significant",
    definition: "A result unlikely to have happened by chance alone, based on a pre-set threshold.",
    mentalModel:
      "A bar you clear, not proof of truth, just evidence the pattern isn't random noise.",
    example:
      "“The results were statistically significant, but the effect was too small to matter.”",
    antiExample:
      "Treating it as proof of a big effect, significance is about confidence, not size.",
    discussion:
      "Researchers set the threshold before the study runs, not after seeing the results.",
    controversy: "Some argue the standard threshold is arbitrary and encourages cherry-picking.",
    relationships: [
      {
        id: "statistically-significant-p-value",
        relationshipType: "Related to",
        description: "",
        direction: "outgoing",
        relatedTermId: "p-value",
        relatedTermName: "P-value",
      },
    ],
  },
];

const ROTATE_INTERVAL_MS = 5000;

function pickNextIndex(current: number, length: number) {
  if (length <= 1) return current;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

function TermCardHeader({ term }: { term: MockTerm }) {
  return (
    <header className="shrink-0 border-b border-base-300/60 px-5 py-3 sm:px-6">
      <h3 className="font-heading m-0 text-xl font-semibold tracking-tight text-base-content sm:text-2xl sm:leading-tight">
        {term.term}
      </h3>
      <p className="mt-1 mb-0 text-xs tracking-wide text-base-content/50">
        <span>{term.domainName}</span>
        <span className="mx-1.5 text-base-content/35" aria-hidden>
          ·
        </span>
        <span>{term.category}</span>
      </p>
    </header>
  );
}

// Dissolve, not a swap. All faces stay mounted so this only ever animates an
// opacity change on an already-painted element, never a fresh mount, which is
// what makes the crossfade actually interpolate instead of snapping.
const CROSSFADE_TRANSITION =
  "transition-opacity duration-700 ease-in-out motion-reduce:transition-none";

function TermCardFace({ term, visible }: { term: MockTerm; visible: boolean }) {
  return (
    <QuizPanel
      className={cn(
        "col-start-1 row-start-1",
        CROSSFADE_TRANSITION,
        visible ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
      )}
    >
      <TermCardHeader term={term} />
      <div className="max-h-[472px] overflow-y-auto px-5 py-4 sm:px-6">
        <TermBody term={term} showSearchLink={false} />
      </div>
    </QuizPanel>
  );
}

export function TermCardMockup() {
  // A fixed starting term keeps server and client markup identical; the random
  // pool only kicks in once this has mounted and the interval starts ticking.
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setActiveIndex((current) => pickNextIndex(current, MOCK_TERMS.length));
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPaused]);

  return (
    <div
      className="relative mx-auto grid w-full max-w-md grid-cols-1 grid-rows-1"
      aria-hidden
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {MOCK_TERMS.map((term, index) => (
        <TermCardFace key={term.id} term={term} visible={index === activeIndex} />
      ))}
    </div>
  );
}
