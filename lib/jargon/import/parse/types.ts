export type ImportFormat =
  | "json"
  | "html_table"
  | "anki"
  | "tsv"
  | "csv"
  | "lines"
  | "pairs"
  | "words";

/** How a line is split into a term and its definition. */
export type SeparatorChoice = "tab" | "dash" | "colon" | "equals" | "comma" | "custom";

export type ColumnRole =
  | "term"
  | "definition"
  | "example"
  | "note"
  | "category"
  | "mental_model"
  | "discussion"
  | "anti_example"
  | "controversy"
  | "ignore";

export type ParseOptions = {
  /** Clipboard `text/html`, used when it holds a table. */
  html?: string;
  /** Overrides the guessed split for one-item-per-line lists. */
  separator?: SeparatorChoice;
  /** The text to split at when `separator` is "custom". */
  customSeparator?: string;
  /** Text that separates cards, for lists that arrive on one line. */
  cardSeparator?: string;
  /** null or undefined means decide from the first row. */
  heading?: boolean | null;
  /** Roles per column, replacing the guessed ones. */
  roles?: ColumnRole[];
  /** Read the text as a list even if it looks like JSON. */
  treatAsText?: boolean;
};

export type ParsedList = {
  format: ImportFormat;
  /** Cells per row, without the heading row. */
  rows: string[][];
  heading: string[] | null;
  /** True when the first row looks like a heading, whether or not it was used. */
  headingDetected: boolean;
  separator: SeparatorChoice | null;
  roles: ColumnRole[];
};

export type DraftTerm = {
  /** Stable key for list rendering and edits. */
  id: string;
  term: string;
  definition: string | null;
  category: string | null;
  example: string | null;
  note: string | null;
  mental_model: string | null;
  discussion: string | null;
  anti_example: string | null;
  controversy: string | null;
};

export type TermConflict = {
  termId: string;
  term: string;
  /** Every different definition the paste gave this term, first one first. */
  definitions: (string | null)[];
};

export type BuiltTerms = {
  terms: DraftTerm[];
  /** Identical rows folded into one. */
  collapsed: number;
  /** Rows that had a definition but no term. */
  withoutTerm: number;
  conflicts: TermConflict[];
};
