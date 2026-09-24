import { createHash } from "node:crypto";
import type { EvalTerm } from "./rubric";

function text(value: string | null): string {
  return value?.trim() ?? "";
}

export function computeTermEvalHash(term: EvalTerm): string {
  const canonical = JSON.stringify([
    term.domainName.trim(),
    term.term.trim(),
    term.category.trim(),
    term.definition.trim(),
    text(term.example),
    text(term.mentalModel),
    text(term.discussion),
    text(term.antiExample),
    text(term.controversy),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
