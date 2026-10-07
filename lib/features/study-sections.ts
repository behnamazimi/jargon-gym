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
        body: "From Notes, a spreadsheet or a table. You check it before anything is added.",
      },
      {
        title: "Bring a deck from another app",
        body: "Step-by-step guides for Quizlet, Anki, Duolingo and five more apps, or import a JSON file.",
      },
      {
        title: "Save one term",
        body: "Save a word the moment you meet it and add the definition later.",
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
    lead: "Three ways to study the same terms, from a first look to a real check.",
    scene: "study",
    items: [
      {
        title: "Read",
        body: "See a term with real usage and get familiar before anyone tests you.",
      },
      {
        title: "Review",
        body: "Try to recall it, then check yourself and say how well you knew it.",
      },
      {
        title: "Quiz",
        body: "Free questions come from your definitions, or let AI write them.",
      },
      {
        title: "Shakiest first",
        body: "Each mode ranks terms by what you're most likely to forget.",
      },
    ],
  },
  {
    layout: "split",
    id: "learn",
    title: "More than a definition",
    lead: "A definition alone won't help you use a word in a meeting, so each term carries more.",
    scene: "learn",
    items: [
      {
        title: "Everything around a term",
        body: "An example, a counter-example, a way to picture it, how it's used in practice, where people disagree, and links to related terms.",
      },
      {
        title: "Show as much as you like",
        body: "Keep parts of a term under More, for one collection or all of them. Customize sits under the term while you study.",
      },
      {
        title: "Hear any term",
        body: "On accounts with voices switched on, play a spoken clip from a term card.",
      },
    ],
  },
  {
    layout: "split",
    id: "stories",
    title: "Stories you can read and hear",
    lead: "Short reads built from your terms. On accounts with voices switched on, they are read aloud so you can listen and repeat.",
    scene: "hear",
    items: [
      {
        title: "Your next terms",
        body: "Each story uses the terms you most need to see.",
      },
      {
        title: "Style, setting, difficulty",
        body: "Choose the writing style, the setting and how hard the sentences are.",
      },
      {
        title: "Read aloud, sentence by sentence",
        body: "The sentence being spoken lights up as you listen.",
      },
      {
        title: "Shadowing",
        body: "Hear a sentence, then say it back in the pause.",
      },
      {
        title: "Repeat, loop or slow down",
        body: "Hear a hard sentence again, on a loop or slower.",
      },
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
        body: "Lobyas never schedules a review for you.",
      },
      {
        title: "Skip what you know",
        body: "Swipe right on terms you already know, or mark one known from anywhere.",
      },
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
        body: "Each term gets a score from what you read, review and quiz, and a level: unknown, learning or known.",
      },
      {
        title: "Daily streak",
        body: "Practise each day to grow it. Open it to see your week.",
      },
    ],
  },
];
