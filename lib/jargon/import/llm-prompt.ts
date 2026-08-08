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
      "category": "Browse label for filters only — e.g. Architecture, Testing",
      "definition": "What the term means, in plain language — meaning only",
      "example": "Optional — concrete scene or natural sentence; omit if definition alone is enough to use the word",
      "mental_model": "Optional — a comparison or analogy that makes the term click; omit if the definition is already intuitive",
      "discussion": "Optional — in practice: tradeoffs, conventions, when you'd reach for it, common misuse",
      "anti_example": "Optional — a near-miss: something that looks like this term but isn't, only when there's real risk of confusing the two",
      "controversy": "Optional — debated: only when practitioners genuinely disagree on meaning or scope"
    }
  ],
  "relationships": [
    {
      "source": "Term name A",
      "target": "Term name B",
      "relationship_type": "prerequisite of",
      "description": "Optional — explanation of the link"
    }
  ]
}

Field rules:
- "term", "category", and "definition" are the only required fields per term.
- "category" is a browse label, not a learning field — pick whatever helps filter the list later.
- "definition" is meaning only: what the term IS. Do not put when to use it, how people disagree, how it differs from a related term, or application nuance in the definition — those belong in other fields.
- "example", "mental_model", "discussion", "anti_example", and "controversy" are all optional. Omit each one individually when it wouldn't add real value — empty optional fields mean "not needed", not "TODO". Do not fill every field on every term.
- Add "example" when the definition alone wouldn't let someone use the word in conversation. Use a concrete scene (where it applies in real work) or a natural sentence (the word used in speech) — whichever makes the term click; one is enough.
- Add "mental_model" when a comparison or analogy would make the term click faster than the definition alone — a memorable "think of it like X" framing. Skip it when the definition is already intuitive on its own.
- Add "discussion" (in practice) for tradeoffs, team conventions, when you'd reach for the word, or common misuse — usage nuance that isn't obvious from the definition and example. Do not restate the definition.
- Add "anti_example" only when there's a real near-miss — something people commonly mistake for this term or confuse it with — worth naming to sharpen the boundary. Skip it when there's no genuine risk of confusion.
- Add "controversy" (debated) only when practitioners genuinely disagree on meaning or scope — not loose usage, not a caution about overuse. Most terms should NOT have this field.
- The "relationships" array as a whole is optional. Add a relationship when two terms have any real connection worth naming — prerequisite of, subtype of, contrasts with, synonym of, depends on, builds on, often confused with, etc. Most terms won't need one, and that's expected.
- A term is complete when someone could use the word correctly in conversation — not when every optional field is filled.

Tone:
- Write like a sharp senior practitioner explaining a term to a smart colleague over Slack — not like a textbook, a dictionary, or a corporate blog post.
- Never start a definition with "refers to", "is defined as", "can be described as", or the term restated as its own subject (e.g. "Coupling is when..."). Open with the substance.
- Don't repeat the same sentence structure or opening word across terms — that repetition is what makes a whole glossary read robotic, even when each definition looks fine alone.
- Ban AI-cliché filler entirely: "it's important to note", "in today's fast-paced world", "leverage", "utilize", "robust", "seamless", "delve into", "unlock", "game-changer", "cutting-edge". Use the plain word instead ("use", not "utilize").
- Don't explain jargon with more jargon. If you need a plainer everyday comparison to make the idea click, use one.
- Be direct and slightly opinionated — say what's actually true in practice, including the annoying caveat, instead of staying neutral.
- Keep sentences short and concrete. If a definition needs two clauses, split it — don't chain qualifiers into one long sentence.
- Ground examples in one concrete, realistic scenario a practitioner would recognize — no toy abstractions ("Object A" and "Object B"). A natural sentence showing the word in speech is also fine when that's what makes the term click.
- When you do include discussion, make it actionable nuance, a tradeoff, or a common misuse — not filler restating the definition.

Rules:
- Include up to 100 must known jargons for "${domain}" — 100 is the ceiling, not a target. Only include terms a newcomer absolutely must know to follow a conversation in this field. Stick to core, high-frequency terms that come up constantly in real work.
- Skip niche, rarely-used, obscure, or "nice to know" terms, even if they're technically part of the domain. If you're unsure whether a term is common enough, leave it out. It's fine — good, even — to return fewer than 100 terms if that's all the domain's must-know vocabulary; never pad the list with weaker terms just to approach the cap.
- Term names must be unique within the import.
- Include up to 100 relationships. source and target must match term names exactly.
- relationship_type should read naturally in a sentence, e.g. "prerequisite of", "subtype of", "contrasts with", "synonym of", "depends on", "often confused with". Don't default to "often confused with" for every pair — pick whichever type actually describes the connection.
- Write for someone learning the field, not for experts skimming acronyms.

Example (different domain, valid format):
${exampleJson}`;
}
