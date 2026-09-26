"use client";

import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Heading,
  Popover,
} from "react-aria-components";
import type { StoryTerm } from "@/lib/stories/types";

export function StoryTermPopover({ text, term }: { text: string; term: StoryTerm | undefined }) {
  if (!term) {
    return (
      <span className="underline decoration-base-content/30 decoration-dotted underline-offset-4">
        {text}
      </span>
    );
  }

  return (
    <DialogTrigger>
      <AriaButton className="cursor-pointer rounded-sm font-medium underline decoration-primary decoration-2 underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/60">
        {text}
      </AriaButton>
      <Popover
        placement="bottom"
        offset={6}
        className="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-box bg-base-100 p-4 shadow-lg ring-1 ring-base-content/10"
      >
        <Dialog className="space-y-1 outline-none" aria-label={term.term}>
          <Heading slot="title" className="m-0 text-sm font-semibold">
            {term.term}
          </Heading>
          <p className="m-0 text-sm leading-relaxed text-base-content/70">{term.definition}</p>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
