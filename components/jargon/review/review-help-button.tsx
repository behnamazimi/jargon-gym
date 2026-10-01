"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const GRADES = [
  {
    label: "Again",
    badge: "badge-error",
    text: "You didn't remember it, or got it wrong. It comes back soon.",
  },
  {
    label: "Hard",
    badge: "badge-warning",
    text: "You got there, but it was a struggle or you weren't sure.",
  },
  {
    label: "Good",
    badge: "badge-success",
    text: "You remembered it after a moment's thought. This should be your usual answer.",
  },
  {
    label: "Easy",
    badge: "badge-info",
    text: "You knew it right away. It stays away the longest.",
  },
];

export function ReviewHelpButton() {
  return (
    <DialogTrigger>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-base-content/60"
        aria-label="How to review"
      >
        <CircleHelp className="size-4" aria-hidden strokeWidth={1.5} />
      </Button>
      <Dialog className="max-w-md">
        <DialogHeader>
          <DialogTitle>How to review</DialogTitle>
          <DialogDescription>
            Look at the term and try to recall what it means before you reveal it. Then rate how it
            went. Your rating decides when the term shows up again.
          </DialogDescription>
        </DialogHeader>

        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {GRADES.map(({ label, badge, text }) => (
            <li key={label} className="flex items-start gap-3 text-sm">
              <span className={`badge badge-soft ${badge} w-14 shrink-0`}>{label}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <p className="m-0 text-sm text-base-content/60">
          Torn between two? Pick the lower one. Being honest keeps the schedule useful.
        </p>

        <p className="m-0 hidden text-sm text-base-content/60 md:block">
          Keys: <kbd className="kbd kbd-sm">Space</kbd> reveals, <kbd className="kbd kbd-sm">1</kbd>
          –<kbd className="kbd kbd-sm">4</kbd> rate, <kbd className="kbd kbd-sm">←</kbd>{" "}
          <kbd className="kbd kbd-sm">→</kbd> move between terms.
        </p>

        <DialogFooter showCloseButton />
      </Dialog>
    </DialogTrigger>
  );
}
