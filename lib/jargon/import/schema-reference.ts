export type SchemaFieldDoc = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type SchemaSectionDoc = {
  title: string;
  description: string;
  fields: SchemaFieldDoc[];
};

export const IMPORT_SCHEMA_SECTIONS: SchemaSectionDoc[] = [
  {
    title: "Root",
    description: "Top-level import object. Creates or merges into one of your owned domains.",
    fields: [
      {
        name: "domain",
        type: "string",
        required: true,
        description:
          "Domain name. If you already own a domain with this name, terms are merged into it.",
      },
      {
        name: "description",
        type: "string | null",
        required: false,
        description: "Optional summary shown on the domain card in your collection.",
      },
      {
        name: "terms",
        type: "array",
        required: true,
        description: "At least one term object. Term names must be unique within the import.",
      },
      {
        name: "relationships",
        type: "array",
        required: false,
        description: "Optional links between terms defined in the same import.",
      },
    ],
  },
  {
    title: "terms[]",
    description: "Each term becomes one card in the domain.",
    fields: [
      {
        name: "term",
        type: "string",
        required: true,
        description: "Display name shown in the list.",
      },
      {
        name: "category",
        type: "string",
        required: true,
        description: "Grouping label used for filters, e.g. Architecture or Design.",
      },
      {
        name: "definition",
        type: "string",
        required: true,
        description: "Primary explanation of the jargon.",
      },
      {
        name: "example",
        type: "string | null",
        required: false,
        description: "Concrete usage example.",
      },
      {
        name: "discussion",
        type: "string | null",
        required: false,
        description: "Extra context, nuance, or notes.",
      },
      {
        name: "controversy",
        type: "string | null",
        required: false,
        description: "Where experts disagree or the term is debated.",
      },
    ],
  },
  {
    title: "relationships[]",
    description: "Both source and target must match a term name from terms[] (case-insensitive).",
    fields: [
      {
        name: "source",
        type: "string",
        required: true,
        description: "Term name the relationship starts from.",
      },
      {
        name: "target",
        type: "string",
        required: true,
        description: "Term name the relationship points to.",
      },
      {
        name: "relationship_type",
        type: "string",
        required: true,
        description: "Relationship label, e.g. often confused with or related to.",
      },
      {
        name: "description",
        type: "string",
        required: false,
        description: "Optional explanation of the relationship.",
      },
    ],
  },
];

export const IMPORT_RULES = [
  "Import always creates or merges into a domain you own.",
  "If a term already exists in that domain, its fields are updated.",
  "Shared domains and other users' collections cannot be imported into.",
  "Duplicate term names inside one import are rejected.",
];
