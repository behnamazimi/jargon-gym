import type { CollectionLanguage } from "@/lib/terms/languages";
import { NARRATION_PAUSE } from "@/lib/ai/speech/pause";
import type { NarrationMode } from "./mode";
import type { NarratedTermFields } from "./types";

function hasText(value: string | null): value is string {
  return Boolean(value?.trim());
}

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
 * unsupported CollectionLanguage) falls back to plain pause-joined
 * concatenation in buildNarrationScript, so narration never mixes languages.
 */
const CONNECTOR_PHRASES: Partial<Record<CollectionLanguage, ConnectorPhrases>> = {
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
  // First-pass translations, flagged for a native speaker's review.
  es: {
    mentalModel: "Piénsalo así:",
    example: "Por ejemplo,",
    antiExample: "Un error común:",
    discussion: "En la práctica,",
    controversy: "Un punto de debate:",
  },
  fr: {
    mentalModel: "Pensez-y ainsi :",
    example: "Par exemple,",
    antiExample: "Une erreur fréquente :",
    discussion: "En pratique,",
    controversy: "Un point de débat :",
  },
  de: {
    mentalModel: "Stell dir das so vor:",
    example: "Zum Beispiel:",
    antiExample: "Ein häufiger Fehler:",
    discussion: "In der Praxis:",
    controversy: "Ein Streitpunkt:",
  },
  it: {
    mentalModel: "Pensala così:",
    example: "Per esempio,",
    antiExample: "Un errore comune:",
    discussion: "Nella pratica,",
    controversy: "Un punto di dibattito:",
  },
  pt: {
    mentalModel: "Pense assim:",
    example: "Por exemplo,",
    antiExample: "Um erro comum:",
    discussion: "Na prática,",
    controversy: "Um ponto de debate:",
  },
  ru: {
    mentalModel: "Представьте это так:",
    example: "Например,",
    antiExample: "Частая ошибка:",
    discussion: "На практике,",
    controversy: "Спорный момент:",
  },
  tr: {
    mentalModel: "Şöyle düşünün:",
    example: "Örneğin,",
    antiExample: "Sık yapılan bir hata:",
    discussion: "Uygulamada,",
    controversy: "Tartışmalı bir nokta:",
  },
  ja: {
    mentalModel: "こう考えてください。",
    example: "たとえば、",
    antiExample: "よくある間違い。",
    discussion: "実際には、",
    controversy: "議論になる点。",
  },
  ko: {
    mentalModel: "이렇게 생각해 보세요.",
    example: "예를 들어,",
    antiExample: "흔한 실수:",
    discussion: "실제로는,",
    controversy: "논쟁이 되는 점:",
  },
  zh: {
    mentalModel: "可以这样理解：",
    example: "例如，",
    antiExample: "常见的错误：",
    discussion: "在实践中，",
    controversy: "有争议的一点：",
  },
};

/**
 * Builds the spoken-narration script for a term. Static and deterministic —
 * no LLM involved — so content_hash over the raw fields is a reliable cache
 * key. Field order mirrors components/terms/term-body.tsx's display order.
 */
export function buildNarrationScript(
  fields: NarratedTermFields,
  language: CollectionLanguage,
  mode: NarrationMode,
): string {
  if (mode === "term") return `${fields.term.trim()}.`;

  const phrases = CONNECTOR_PHRASES[language];
  const parts = [`${fields.term}. ${(fields.definition ?? "").trim()}`];

  function addSection(value: string | null, phrase: keyof ConnectorPhrases) {
    if (!hasText(value)) return;
    const prefix = phrases ? `${phrases[phrase]} ` : "";
    parts.push(`\n${NARRATION_PAUSE} ${prefix}${value.trim()}`);
  }

  addSection(fields.mental_model, "mentalModel");
  addSection(fields.example, "example");
  addSection(fields.anti_example, "antiExample");
  addSection(fields.discussion, "discussion");
  addSection(fields.controversy, "controversy");

  return parts.join(" ");
}
