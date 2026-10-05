import type { FeatureSection } from "./types";

export const STUDY_SECTIONS: FeatureSection[] = [
  {
    layout: "split",
    id: "start",
    title: "Get your terms in",
    lead: "Getting your first collection in is quick.",
    scene: "start",
    items: [
      {
        title: "Add a shared collection",
        body: "Search what other members shared and add it in one tap. Remove it any time.",
      },
      {
        title: "Paste a list",
        body: "From Notes, a spreadsheet or a table. You check it before anything is added, and no AI reads it.",
      },
      {
        title: "Bring a deck from another app",
        body: "Export guides for Quizlet, Anki, Duolingo and five more apps. Or import JSON, with a prompt any AI chat can use to draft a glossary.",
      },
      {
        title: "Save one term",
        body: "Capture a word the moment you meet it. A name is enough: it waits out of practice until you add a definition.",
      },
      {
        title: "Request a collection",
        body: "Can't find one? Ask for it and get a private copy when it's built.",
      },
    ],
  },
  {
    layout: "split",
    id: "study",
    title: "Read, review, quiz",
    lead: "Three ways to study, and each one puts the terms you're shakiest on first.",
    scene: "study",
    items: [
      {
        title: "Read",
        body: "See a term with real usage and get familiar before anyone tests you.",
      },
      {
        title: "Review",
        body: "Recall it first, then reveal and rate yourself: Again, Hard, Good or Easy.",
      },
      {
        title: "Quiz",
        body: "Free questions come from your definitions. AI-written questions are sharper.",
      },
      {
        title: "Shakiest first",
        body: "Each mode ranks terms by what you're most likely to forget.",
      },
      {
        title: "Study in any order",
        body: "Most people read, then review, then quiz. You can skip around.",
      },
      { title: "One collection or all", body: "Pick the scope for each session." },
    ],
  },
  {
    layout: "split",
    id: "learn",
    title: "Learn terms you can use",
    lead: "A definition alone won't help you use a word in a meeting, so each term carries more.",
    scene: "learn",
    items: [
      {
        title: "Terms beyond a definition",
        body: "Example, mental model, in practice, anti-example, debated and relationships to nearby terms.",
      },
      {
        title: "Hear any term",
        body: "Play a spoken clip from a term card.",
      },
      {
        title: "Fields and languages",
        body: "Terms of a trade, or words and phrases in a language you're learning.",
      },
    ],
  },
  {
    layout: "split",
    id: "stories",
    title: "Stories made from your terms",
    lead: "A short read written around the terms you're learning, so they show up in context.",
    scene: "stories",
    items: [
      {
        title: "Your next terms",
        body: "Each story uses the terms you're due to see next.",
      },
      {
        title: "Style, setting, difficulty",
        body: "Choose the voice, the scene and how hard the sentences are.",
      },
      {
        title: "Mark known as you read",
        body: "Skip a term for good without leaving the page.",
      },
      { title: "Story history", body: "Reopen anything you read before." },
      { title: "Open on Stories", body: "Make it your default way into Read." },
    ],
  },
  {
    layout: "split",
    id: "listen",
    title: "Listen and shadow in Stories",
    lead: "Every story can be read aloud in an AI voice. Turn on shadowing to repeat each sentence out loud.",
    scene: "hear",
    items: [
      {
        title: "Read aloud, line by line",
        body: "The sentence being spoken lights up and the page follows along. A backup voice keeps playback working.",
      },
      {
        title: "Shadowing",
        body: "Hear a sentence, then say it in the gap. Pauses of 1×, 1.5× or 2× the sentence.",
      },
      {
        title: "Repeat, loop or slow down",
        body: "Play each sentence 2, 3 or 5 times or on a loop, and change the speed.",
      },
      { title: "Tap any sentence", body: "Jump to it and hear it again." },
    ],
  },
  {
    layout: "split",
    id: "no-guilt",
    title: "Nothing to fall behind on",
    lead: "Come back after a day or a month. Nothing piles up.",
    scene: "noGuilt",
    items: [
      {
        title: "No due dates",
        body: "Nothing is overdue and nothing piles up while you're away.",
      },
      {
        title: "Skip what you know",
        body: "Swipe through your terms: right for known, left for not yet. Undo the last one if you slip.",
      },
      { title: "Mark known anywhere", body: "From the Library, a card or a story." },
      {
        title: "Pause a collection",
        body: "Take it out of practice for a busy month, then bring it back.",
      },
    ],
  },
  {
    layout: "split",
    id: "progress",
    title: "Progress from what you do",
    lead: "Mastery grows while you practise and fades when you stop.",
    scene: "progress",
    items: [
      {
        title: "Mastery per term",
        body: "One number built from what you read, review and quiz.",
      },
      {
        title: "Known, learning, unknown",
        body: "Worked out for you. You never set it by hand.",
      },
      {
        title: "Mastery page",
        body: "An overview, per-term views, tier filters and pace for each collection.",
      },
      {
        title: "Daily streak",
        body: "Practise each day to grow it. Open it to see your week.",
      },
    ],
  },
];
