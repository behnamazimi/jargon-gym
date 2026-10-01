import { pluralize } from "@/lib/utils";
import type { DeclineReason, RequestKind, RequestLevel } from "./types";

/** Every user-facing string of the request flow. The never-use rules (no
 *  automation talk, no progress bars, nobody named as doing the work) are
 *  checked against this file by copy.test.ts. */
export const REQUEST_COPY = {
  chooser: {
    rowTitle: (query: string) => `Request “${query}”`,
    rowSubtitle: "We'll prepare it and add it to your Library.",
    quotaLine: "You can have 1 request open at a time.",
    openRequest: (topic: string) => `You have a request open: “${topic}”. See it in your Library.`,
    capReached: (date: string) =>
      `You've used your 3 requests for now. You can ask again on ${date}.`,
    noMatch: (query: string) =>
      `Nothing shared matches “${query}”. Request it, try a list, or start an empty collection.`,
  },
  form: {
    title: "Request a collection",
    intro: "Tell us what you want to learn.",
    quota: (used: number) =>
      `You can have 1 request open at a time. You've used ${used} of 3 in the last 30 days.`,
    topicLabel: "Topic",
    topicPlaceholder: "e.g. Kubernetes for product managers",
    kindLabel: "What kind?",
    kinds: {
      jargon: "A field's jargon",
      vocabulary: "Language vocabulary",
    } satisfies Record<RequestKind, string>,
    languageLabel: "Language",
    detailsToggle: "Add details (optional)",
    levelLabel: "Level",
    levels: {
      new: "New to it",
      basics: "Know the basics",
      brushing_up: "Brushing up",
      a1_a2: "A1–A2",
      b1_plus: "B1 and up",
    } satisfies Record<RequestLevel, string>,
    sizeLabel: "Size",
    size: (size: number) => `About ${size}`,
    knownLabel: "Terms you've come across",
    knownHelp: "One per line. We'll include them if they fit.",
    privacy: "Please leave out confidential company details and personal information.",
    submit: "Send request",
    sending: "Sending…",
    eta: (days: number) => `Usually ready within ${pluralize(days, "day")}`,
    closeMatches: "Close matches",
    repeatTopic: (topic: string, date: string, sentence: string) =>
      `You asked for “${topic}” on ${date}. ${sentence}`,
    existingName: (name: string) => `You already have a collection called “${name}”.`,
    paused: (days: number) =>
      `Requests are taking longer than usual right now. New requests are usually ready within ${pluralize(days, "day")}.`,
    closed: "Requests are closed for now.",
    openRequest: (topic: string) => `You already have a request open: “${topic}”.`,
    capReached: (date: string) =>
      `You've used your 3 requests for now. You can ask again on ${date}.`,
    seeLibrary: "See it in your Library",
    openIt: "Open it",
    sendFailed: "We couldn't send your request. Try again.",
    signedOut: "Sign in to send a request.",
  },
  sent: {
    title: "Request sent",
    body: (topic: string, days: number) =>
      `We'll prepare “${topic}” and add it to your Library, usually within ${pluralize(days, "day")}.`,
    howTitle: "How should we tell you?",
    email: "Email",
    emailHint: "To your account address",
    done: "Done",
    browse: "Browse while you wait",
  },
  card: {
    pills: {
      requested: "In the queue",
      in_progress: "Being prepared",
      needs_input: "Question for you",
      ready: "Ready",
    },
    usuallyBy: (date: string) => `Usually ready by ${date}`,
    preparing: "Choosing the key terms and writing definitions and examples.",
    delayed: (date: string) => `Taking a little longer than usual · new estimate ${date}`,
    question: "We have a quick question about your request.",
    replyLabel: "Your reply",
    sendReply: "Send reply",
    sendingReply: "Sending…",
    ready: (terms: number) => `${pluralize(terms, "term")} added to your Library.`,
    addedShared: (name: string) =>
      `“${name}” was already in Browse, so we added it to your Library.`,
    filled: (terms: number) =>
      `${pluralize(terms, "term")} now ${terms === 1 ? "has a definition" : "have definitions"}.`,
    startReading: "Start reading",
    openCollection: "Open collection",
    declinedTitle: "We couldn't prepare this one",
    pasteList: "Paste a list",
    browse: "Browse collections",
    cancel: "Cancel request",
    cancelTitle: (topic: string) => `Cancel “${topic}”?`,
    cancelBody: "You can send a new request afterwards.",
    cancelBodyStarted: "We've already started, so this still counts toward your 3 requests.",
    keep: "Keep it",
    dismiss: "Dismiss",
    cancelled: "Request cancelled",
    replySent: "Reply sent",
    actionFailed: "That didn't work. Try again.",
    notReplyable: "This request isn't waiting for a reply any more.",
  },
  definitions: {
    link: "Request definitions",
    title: "Request definitions",
    intro: (name: string) => `We'll write definitions for the words waiting in “${name}”.`,
    waiting: (count: number) => `${pluralize(count, "word")} waiting for a definition`,
    topic: (name: string) => `Definitions: ${name}`.slice(0, 120),
    nothingToDefine: "Every word in that collection already has a definition.",
    notYours: "You can only request definitions for your own collections.",
  },
  declineReasons: {
    too_broad:
      "That topic is too broad to cover well in one collection. Try a narrower one, for example a single area within it.",
    too_niche:
      "That topic is too narrow for us to prepare a collection around. Try a wider one, or add the terms yourself.",
    not_jargon_or_vocabulary:
      "That isn't something we can prepare as jargon or vocabulary. Collections here are terms with definitions.",
    language_not_supported:
      "We can't prepare collections in that language yet. English and Dutch are supported.",
    team_internal: "We can't know a team's own terms. Paste your team's list instead.",
  } satisfies Record<DeclineReason, string>,
  public: {
    privacy: "If you request a collection, our team reads your request to prepare it.",
    faq: "Can't find a collection on your topic? Request one. Our team prepares each requested collection and adds it to your Library, and it stays private to you unless you share it.",
  },
} as const;
