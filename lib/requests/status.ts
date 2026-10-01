import { REQUEST_COPY } from "./copy";
import type { DisplayStatus, MyRequest } from "./types";

type Pill = { label: string; tone: "queue" | "prep" | "question" | "ready" };

/** "Being prepared" belongs to work that has actually started, and to nothing else. */
export function pillFor(status: DisplayStatus): Pill | null {
  switch (status) {
    case "requested":
      return { label: REQUEST_COPY.card.pills.requested, tone: "queue" };
    case "in_progress":
      return { label: REQUEST_COPY.card.pills.in_progress, tone: "prep" };
    case "needs_input":
      return { label: REQUEST_COPY.card.pills.needs_input, tone: "question" };
    case "ready":
      return { label: REQUEST_COPY.card.pills.ready, tone: "ready" };
    case "declined":
      return null;
  }
}

/** The line that follows "You asked for … on …". */
export function statusSentence(request: Pick<MyRequest, "displayStatus">): string {
  switch (request.displayStatus) {
    case "requested":
      return "It's in the queue.";
    case "in_progress":
      return "It's being prepared.";
    case "needs_input":
      return "We have a question for you.";
    case "ready":
      return "It's ready.";
    case "declined":
      return "We couldn't prepare it.";
  }
}

/** The date line: the estimate, or the new estimate once a delay notice went out. */
export function dueLine(request: Pick<MyRequest, "dueDate" | "delayNotified">): string {
  return request.delayNotified
    ? REQUEST_COPY.card.delayed(request.dueDate)
    : REQUEST_COPY.card.usuallyBy(request.dueDate);
}
