import { STUDY_SECTIONS } from "./study-sections";
import type { FeatureSection } from "./types";

export type * from "./types";

/** The Features page, in reading order. Ids are anchors, so keep them stable. */
export const FEATURE_SECTIONS: FeatureSection[] = [
  ...STUDY_SECTIONS,
  {
    layout: "cards",
    id: "find",
    title: "Manage your collections",
    lead: "Keep big collections tidy.",
    items: [
      {
        icon: "book",
        title: "Library",
        body: "Browse by collection and search every term and definition.",
      },
      {
        icon: "pencil",
        title: "Edit anything",
        body: "Every field, category and link between terms, any time.",
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
        body: "Use /read, /review and /quiz, with reminders when you want them.",
      },
      {
        icon: "monitor",
        title: "macOS widget",
        body: "The next term sits on your desktop. Reveal it, or move on to the next one.",
      },
      {
        icon: "bug",
        title: "Report an issue",
        body: "Send a problem or an idea from any page, with a screenshot if it helps.",
      },
    ],
  },
  {
    layout: "cards",
    id: "ai-and-cost",
    title: "AI and credits",
    lead: "Quiz and Stories use AI. New accounts get free credits, and limits can change.",
    items: [
      {
        icon: "star",
        title: "Free credits every month",
        body: "New accounts get credits, plus a monthly refill.",
      },
      {
        icon: "shield",
        title: "Voices don't use credits",
        body: "Spoken clips are free, and switched on for some accounts only.",
      },
    ],
  },
];
