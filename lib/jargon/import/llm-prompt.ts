import { IMPORT_SAMPLE_PAYLOAD, stringifyImportPayload } from "./sample-payload";

export function buildImportLlmPrompt(domain: string): string {
  const exampleJson = stringifyImportPayload(IMPORT_SAMPLE_PAYLOAD);

  return `Generate a jargon glossary as JSON for the domain "${domain}".

I will paste your response into Jargon Gym, a personal jargon review app. Return only valid JSON — no markdown code fences, no explanation before or after.

JSON structure:
{
  "domain": "${domain}",
  "description": "Optional one-line summary of this domain",
  "terms": [
    {
      "term": "Term name",
      "category": "Grouping label for filters, e.g. Architecture",
      "definition": "Clear explanation in plain language",
      "example": "Optional concrete usage example",
      "discussion": "Optional extra context or nuance",
      "controversy": "Optional note if the term is debated"
    }
  ],
  "relationships": [
    {
      "source": "Term name A",
      "target": "Term name B",
      "relationship_type": "often confused with",
      "description": "Optional explanation of the link"
    }
  ]
}

Rules:
- Include at least 10 useful terms for "${domain}".
- Every term needs term, category, and definition. Add example and discussion when they help.
- Term names must be unique within the import.
- relationships are optional. source and target must match term names exactly.
- relationship_type should read naturally in a sentence, e.g. "often confused with", "related to", "prerequisite for".
- Write for someone learning the field, not for experts skimming acronyms.

Example (different domain, valid format):
${exampleJson}`;
}
