export type AppGuide = {
  slug: string;
  name: string;
  /** The line under the app's name in the picker. */
  summary: string;
  /** Numbered steps. The page adds the closing "come back and paste" step. */
  steps: string[];
  /** One honest caveat, shown under the steps. */
  note?: string;
  /** A link to open the app's site, when its export lives there. */
  link?: { href: string; label: string };
  /** False when the app has nothing to export and the guide says so. */
  canExport: boolean;
};

export const APP_GUIDES: AppGuide[] = [
  {
    slug: "quizlet",
    name: "Quizlet",
    summary: "Sets you made · from the website",
    steps: [
      "Open quizlet.com in your phone's browser. The Quizlet app can't export.",
      "Open your set, tap ••• and choose Export.",
      "Tap Copy text. Keep the usual separators.",
    ],
    note: "Quizlet only exports sets you created yourself. Used your own separators, like ## between cards? Pick them on the next screen.",
    link: { href: "https://quizlet.com", label: "Open quizlet.com" },
    canExport: true,
  },
  {
    slug: "anki",
    name: "Anki",
    summary: "Notes in Plain Text export",
    steps: [
      "On a computer, open Anki and choose File, then Export.",
      "Pick Notes in Plain Text, and choose the deck.",
      "Save the file and open it on this phone, or copy its text.",
    ],
    canExport: true,
  },
  {
    slug: "google-translate",
    name: "Google Translate",
    summary: "Saved phrases via Google Sheets",
    steps: [
      "On a computer, open Google Translate and go to Saved.",
      "Choose Export to Google Sheets.",
      "Copy the columns you want from the sheet.",
    ],
    canExport: true,
  },
  {
    slug: "noji",
    name: "Noji",
    summary: "CSV export of your decks",
    steps: [
      "Open your deck in Noji and go to Settings.",
      "Choose Export deck, then CSV.",
      "Open the file on this phone, or copy its text.",
    ],
    note: "Noji only exports decks you made.",
    canExport: true,
  },
  {
    slug: "mochi",
    name: "Mochi",
    summary: "CSV export",
    steps: [
      "Open your deck in Mochi and choose Export.",
      "Pick CSV.",
      "Open the file on this phone, or copy its text.",
    ],
    canExport: true,
  },
  {
    slug: "brainscape",
    name: "Brainscape",
    summary: "Export or copy from the editor",
    steps: [
      "Open your deck in Brainscape.",
      "If your plan has Export, use it. Otherwise open the deck's edit view and copy the cards.",
    ],
    note: "Export may need a paid plan.",
    canExport: true,
  },
  {
    slug: "duolingo",
    name: "Duolingo",
    summary: "No export · type the words you want",
    steps: [],
    note: "Duolingo doesn't offer an export. Type or paste the words you want to learn, or browse shared collections.",
    canExport: false,
  },
  {
    slug: "memrise",
    name: "Memrise",
    summary: "Copy from the course page",
    steps: [
      "Open the course page in a browser.",
      "Select the words and their meanings, and copy them.",
    ],
    note: "Memrise has no official export.",
    canExport: true,
  },
  {
    slug: "other",
    name: "Something else",
    summary: "Any CSV or text file",
    steps: [
      "Export your list as CSV or text, or select it and copy it.",
      "Spreadsheet columns work too: copy the cells.",
    ],
    canExport: true,
  },
];

export function findGuide(slug: string): AppGuide | undefined {
  return APP_GUIDES.find((guide) => guide.slug === slug);
}
