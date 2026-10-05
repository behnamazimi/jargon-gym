import { STUDY_SECTIONS } from "./study-sections";
import type { FeatureSection } from "./types";

export type * from "./types";

/** The Features page, in reading order. Ids are anchors, so keep them stable. */
export const FEATURE_SECTIONS: FeatureSection[] = [
  ...STUDY_SECTIONS,
  {
    layout: "cards",
    id: "find",
    title: "Find your way around",
    lead: "For when your collections get big.",
    items: [
      {
        icon: "book",
        title: "Library",
        body: "Browse by collection. Press / to search terms and definitions. Filters stay where you left them.",
      },
      {
        icon: "pencil",
        title: "Edit anything",
        body: "Every field, category and relationship, any time.",
      },
      {
        icon: "globe",
        title: "Browse shared collections",
        body: "Love the good ones and report problems.",
      },
      { icon: "download", title: "Export", body: "Take a collection out as text or JSON." },
    ],
  },
  {
    layout: "cards",
    id: "everywhere",
    title: "Wherever you are",
    lead: "Pick up where you left off on any device.",
    items: [
      {
        icon: "phone",
        title: "Install as an app",
        body: "Add it to your phone. The layout is built for thumbs.",
      },
      {
        icon: "send",
        title: "Telegram bot",
        body: "Use /read, /review and /quiz, with reminders on your own cadence.",
      },
      {
        icon: "monitor",
        title: "macOS widget",
        body: "The next term sits on your desktop. Reveal it, or move on to the next one.",
      },
    ],
  },
  {
    layout: "cards",
    id: "ai-and-cost",
    title: "AI and credits",
    lead: "Quiz and Stories use AI, and it comes free with your account.",
    items: [
      {
        icon: "star",
        title: "Credits to start",
        body: "New accounts get AI credits, plus a monthly refill. If an AI run fails, the credits come back.",
      },
      {
        icon: "key",
        title: "Bring your own key",
        body: "Use a Google or Anthropic key, and Quiz and Stories run on it instead of your credits.",
      },
      {
        icon: "shield",
        title: "Where AI runs",
        body: "Quiz, Stories and voices.",
      },
    ],
  },
];
