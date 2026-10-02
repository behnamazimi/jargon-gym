import type { ImportPayload } from "./types";

export const IMPORT_SAMPLE_PAYLOAD: ImportPayload = {
  domain: "Software Engineering",
  language: "en",
  description: "Core vocabulary for software architecture, design, and delivery.",
  terms: [
    {
      term: "Coupling",
      category: "Architecture",
      definition:
        "The degree to which one component depends on another's internals: the tighter the coupling, the more a change on one side risks breaking the other.",
      example:
        "Billing code that directly reads fields from the user-profile table breaks if that table changes.",
      mental_model:
        "Think of it like two people sharing a single house key. Convenient until one of them changes the lock.",
      discussion:
        "Teams usually reduce coupling by communicating through a stable API or event contract instead of reaching into another service's internal data model directly.",
      note: "The word is borrowed from physics, where coupling is how strongly two systems influence each other.",
    },
    {
      term: "Cohesion",
      category: "Architecture",
      definition:
        "How tightly a module's responsibilities relate to one single purpose, rather than being a grab-bag of unrelated tasks.",
      example:
        "A module that only sends emails is more cohesive than one that also handles payments.",
      anti_example:
        "A 'utils' file that handles date formatting, API calls, and validation isn't cohesive. Those are unrelated concerns bundled together.",
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

export function stringifyImportPayload(payload: ImportPayload, pretty = true): string {
  return JSON.stringify(payload, null, pretty ? 2 : 0);
}
