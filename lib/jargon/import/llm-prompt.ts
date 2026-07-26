import { IMPORT_SAMPLE_PAYLOAD, stringifyImportPayload } from "./sample-payload";

export function buildImportLlmPrompt(domain: string): string {
  const exampleJson = stringifyImportPayload(IMPORT_SAMPLE_PAYLOAD);

  return `Generate a jargon glossary as JSON for the domain "${domain}".

I will paste your response into Jargon Gym, a personal jargon review app. Return only valid JSON — no markdown code fences, no explanation before or after.

JSON structure:
{
  "domain": "${domain}",
  "description": "One-line summary of this domain",
  "terms": [
    {
      "term": "Term name",
      "category": "Grouping label for filters, e.g. Architecture",
      "definition": "Clear explanation in plain language",
      "example": "Optional — concrete usage example",
      "discussion": "Optional — extra context or nuance",
      "controversy": "Optional — note if the term is debated"
    }
  ],
  "relationships": [
    {
      "source": "Term name A",
      "target": "Term name B",
      "relationship_type": "often confused with",
      "description": "Optional — explanation of the link"
    }
  ]
}

Field rules:
- "term", "category", and "definition" are the only required fields per term.
- "example", "discussion", and "controversy" are all optional. Omit each one individually whenever it wouldn't add real value — don't feel obligated to fill in every field for every term. Most terms should NOT have a controversy field; only genuinely debated terms should.
- The "relationships" array as a whole is optional, and so is having a relationship for any given term. Only add a relationship when there's a real, useful connection worth pointing out (confusion risk, dependency, hierarchy, etc.) — most terms won't need one, and that's expected, not a gap to fill.

Tone:
- Write like a sharp senior practitioner explaining a term to a smart colleague over Slack — not like a textbook, a dictionary, or a corporate blog post.
- Never start a definition with "refers to", "is defined as", "can be described as", or the term restated as its own subject (e.g. "Coupling is when..."). Open with the substance.
- Don't repeat the same sentence structure or opening word across terms — that repetition is what makes a whole glossary read robotic, even when each definition looks fine alone.
- Ban AI-cliché filler entirely: "it's important to note", "in today's fast-paced world", "leverage", "utilize", "robust", "seamless", "delve into", "unlock", "game-changer", "cutting-edge". Use the plain word instead ("use", not "utilize").
- Don't explain jargon with more jargon. If you need a plainer everyday comparison to make the idea click, use one.
- Be direct and slightly opinionated — say what's actually true in practice, including the annoying caveat, instead of staying neutral.
- Keep sentences short and concrete. If a definition needs two clauses, split it — don't chain qualifiers into one long sentence.
- Ground examples in one concrete, realistic scenario a practitioner would recognize — no toy abstractions ("Object A" and "Object B").
- When you do include discussion, make it actionable nuance or a common misuse — not filler restating the definition.

Rules:
- Include up to 100 must known jargons for "${domain}" — 100 is the ceiling, not a target. Only include terms a newcomer absolutely must know to follow a conversation in this field. Stick to core, high-frequency terms that come up constantly in real work.
- Skip niche, rarely-used, obscure, or "nice to know" terms, even if they're technically part of the domain. If you're unsure whether a term is common enough, leave it out. It's fine — good, even — to return fewer than 100 terms if that's all the domain's must-know vocabulary; never pad the list with weaker terms just to approach the cap.
- Term names must be unique within the import.
- Include up to 100 relationships. source and target must match term names exactly.
- relationship_type should read naturally in a sentence, e.g. "often confused with", "depends on", "prerequisite for".
- Write for someone learning the field, not for experts skimming acronyms.

Example (different domain, valid format):
${exampleJson}`;
}
