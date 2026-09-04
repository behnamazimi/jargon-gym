import type { DomainLanguage } from "@/lib/jargon/languages";
import type { NarratedTermFields } from "./types";

function hasText(value: string | null): value is string {
  return Boolean(value?.trim());
}

const PAUSE = "[pause]";

type ConnectorPhrases = {
  mentalModel: string;
  example: string;
  antiExample: string;
  discussion: string;
  controversy: string;
};

/**
 * Connector phrases per collection language. A language present here gets
 * the phrased template below; a language without an entry (any future/
 * unsupported DomainLanguage) falls back to plain [pause]-joined
 * concatenation in buildNarrationScript, so narration never mixes languages.
 */
const CONNECTOR_PHRASES: Partial<Record<DomainLanguage, ConnectorPhrases>> = {
  en: {
    mentalModel: "Think of it like this:",
    example: "For example,",
    antiExample: "A common mistake:",
    discussion: "In practice,",
    controversy: "One point of debate:",
  },
  // First-pass translation — flagged as needing a native speaker's review
  // before trusting it for real listeners.
  nl: {
    mentalModel: "Denk er zo over na:",
    example: "Bijvoorbeeld,",
    antiExample: "Een veelgemaakte fout:",
    discussion: "In de praktijk,",
    controversy: "Een discussiepunt:",
  },
};

/**
 * Builds the spoken-narration script for a term. Static and deterministic —
 * no LLM involved — so content_hash over the raw fields is a reliable cache
 * key. Field order mirrors components/jargon/term-body.tsx's display order.
 */
export function buildNarrationScript(fields: NarratedTermFields, language: DomainLanguage): string {
  const phrases = CONNECTOR_PHRASES[language];
  const parts = [`${fields.term}. ${fields.definition.trim()}`];

  function addSection(value: string | null, phrase: keyof ConnectorPhrases) {
    if (!hasText(value)) return;
    const prefix = phrases ? `${phrases[phrase]} ` : "";
    parts.push(`${PAUSE} ${prefix}${value.trim()}`);
  }

  addSection(fields.mental_model, "mentalModel");
  addSection(fields.example, "example");
  addSection(fields.anti_example, "antiExample");
  addSection(fields.discussion, "discussion");
  addSection(fields.controversy, "controversy");

  return parts.join(" ");
}
