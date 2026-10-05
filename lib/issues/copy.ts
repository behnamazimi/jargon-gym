import { BODY_MIN, DAILY_LIMIT, type IssueKind } from "./schema";

/** Every user-facing string of the issue report flow. copy.test.ts checks the never-use list. */
export const ISSUE_COPY = {
  menuLabel: "Report an issue",
  title: "Report an issue",
  intro: "Something broken, or an idea to make it better? Tell us.",
  kindLabel: "What is it?",
  kinds: { problem: "Problem", idea: "Idea" } satisfies Record<IssueKind, string>,
  bodyLabel: "What happened?",
  bodyPlaceholder: {
    problem: "What did you do, what did you expect, and what happened instead?",
    idea: "What would you like, and what would it help you do?",
  } satisfies Record<IssueKind, string>,
  bodyTooShort: `At least ${BODY_MIN} characters`,
  screenshotLabel: "Screenshot (optional)",
  screenshotAdd: "Add a screenshot",
  screenshotPreparing: "Preparing…",
  screenshotPasteHint: "Or paste one here.",
  screenshotRemove: "Remove screenshot",
  screenshotHint: "Screenshots may show your email or terms. Crop anything you'd rather not share.",
  screenshotUnsupported: "Use a PNG, JPEG or WebP image.",
  screenshotUnreadable: "Couldn't read that image. Try another one.",
  cancel: "Cancel",
  send: "Send",
  sending: "Sending…",
  sent: "Thanks, we got it.",
  quotaReached: `You've sent ${DAILY_LIMIT} reports today. Try again tomorrow.`,
  invalid: "Check the details and try again.",
  failed: "Couldn't send it. Try again.",
} as const;
