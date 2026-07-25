import type { ImportPayload } from "./types";

export const IMPORT_SAMPLE_PAYLOAD: ImportPayload = {
  domain: "Software Engineering",
  description: "Core vocabulary for software architecture, design, and delivery.",
  terms: [
    {
      term: "Coupling",
      category: "Architecture",
      definition:
        "The degree to which one component depends on another's internals — the tighter the coupling, the more a change on one side risks breaking the other.",
      example:
        "Billing code that directly reads fields from the user-profile table breaks if that table changes.",
      discussion:
        "Teams usually reduce coupling by communicating through a stable API or event contract instead of reaching into another service's internal data model directly.",
    },
    {
      term: "Cohesion",
      category: "Architecture",
      definition:
        "How tightly a module's responsibilities relate to one single purpose, rather than being a grab-bag of unrelated tasks.",
      example:
        "A module that only sends emails is more cohesive than one that also handles payments.",
    },
  ],
  relationships: [
    {
      source: "Coupling",
      target: "Cohesion",
      relationship_type: "often confused with",
      description:
        "High cohesion and low coupling often go together, but they describe different things.",
    },
  ],
};

export const IMPORT_MINIMAL_PAYLOAD: ImportPayload = {
  domain: "My Domain",
  terms: [
    {
      term: "Example term",
      category: "General",
      definition: "A short definition of the term.",
    },
  ],
};

export function stringifyImportPayload(payload: ImportPayload, pretty = true): string {
  return JSON.stringify(payload, null, pretty ? 2 : 0);
}
