import type { FeatureSection } from "./types";

export const STUDY_SECTIONS: FeatureSection[] = [
  {
    layout: "split",
    id: "start",
    title: "Start without the effort",
    lead: "Getting your first collection in is quick.",
    scene: "start",
    items: [
      {
        title: "Shared collections",
        body: "Search what other members shared and add it in one tap. Remove it any time.",
      },
      {
        title: "Paste a list",
        body: "From Notes, a spreadsheet or a table. A Check screen shows what will be added first.",
      },
      {
        title: "Bring a deck",
        body: "Export guides for Quizlet, Anki, Google Translate, Noji, Mochi, Brainscape, Duolingo and Memrise.",
      },
      {
        title: "Import JSON",
        body: "A documented format, plus a prompt that has any LLM draft a glossary for a field or language.",
      },
      {
        title: "Save one term",
        body: "Capture a word the moment you meet it. A name is enough: it waits out of practice until you add a definition.",
      },
      {
        title: "Request a collection",
        body: "Can't find one? Ask for it and get a private copy when it's built.",
      },
      {
        title: "Import without AI",
        body: "Nothing you paste is sent to a model. Parsing is plain rules, so it is free.",
      },
    ],
  },
  {
    layout: "split",
    id: "learn",
    title: "Learn terms you can actually use",
    lead: "A definition alone won't help you use a word in a meeting, so each term carries more.",
    scene: "learn",
    items: [
      {
        title: "Terms beyond a definition",
        body: "Example, mental model, in practice, anti-example, debated and relationships to nearby terms.",
      },
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
        body: "A real check. Free questions come from your definitions; AI questions are sharper.",
      },
      {
        title: "Study in any order",
        body: "Most people read, review, then quiz, but you can use them in any order.",
      },
      { title: "One collection or all", body: "Pick the scope for each session." },
      {
        title: "Hear any term",
        body: "Play a spoken clip from a term card.",
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
        title: "From your queue",
        body: "Each story uses the terms your queue ranks next.",
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
    lead: "Every story can be read aloud in a natural AI voice. Turn on shadowing to repeat each sentence out loud.",
    scene: "hear",
    items: [
      {
        title: "AI voices",
        body: "Stories are read aloud, with a backup voice so playback keeps working.",
      },
      {
        title: "Sentence highlight",
        body: "The sentence being spoken lights up and the page follows along.",
      },
      {
        title: "Shadowing",
        body: "Hear a sentence, then say it in the gap. Pauses of 1×, 1.5× or 2× the sentence.",
      },
      {
        title: "Repeat or loop",
        body: "Play each sentence 2, 3 or 5 times, or loop it until you stop.",
      },
      {
        title: "Speed control",
        body: "Slow a hard sentence down, or speed up an easy one.",
      },
      { title: "Tap any sentence", body: "Jump to it and hear it again." },
    ],
  },
  {
    layout: "split",
    id: "no-guilt",
    title: "No guilt, no backlog",
    lead: "There are no due dates, so there is nothing to fall behind on. Come back whenever.",
    scene: "noGuilt",
    items: [
      {
        title: "No due dates",
        body: "Nothing is overdue and nothing piles up while you're away.",
      },
      {
        title: "Shakiest first",
        body: "Each mode ranks terms by what you're most likely to forget.",
      },
      {
        title: "Skip what you know",
        body: "Swipe through a deck of terms: right for known, left for not yet. Undo the last one if you slip.",
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
    title: "Progress you can believe",
    lead: "Mastery comes from what you actually do, and it fades when you stop practising.",
    scene: "progress",
    items: [
      {
        title: "Mastery per term",
        body: "One number blended from reading, recall and recognition.",
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
