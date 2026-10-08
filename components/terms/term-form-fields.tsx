import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TermRelationshipsEditor } from "@/components/terms/term-relationships-editor";
import type { RelationshipDraft } from "@/lib/terms/relationship-schema";
import type { TermFormValues } from "@/lib/terms/term-schema";
import type { LibraryTerm } from "@/lib/terms/types";

type TermFormFieldsProps = {
  form: TermFormValues;
  onFieldChange: <K extends keyof TermFormValues>(key: K, value: TermFormValues[K]) => void;
  canManageRelationships: boolean;
  relationshipDrafts: RelationshipDraft[];
  onRelationshipDraftsChange: (drafts: RelationshipDraft[]) => void;
  collectionTerms: Pick<LibraryTerm, "id" | "term">[];
  sourceTermId: string | undefined;
};

type FieldsProps = {
  form: TermFormValues;
  onFieldChange: <K extends keyof TermFormValues>(key: K, value: TermFormValues[K]) => void;
};

export function CategoryField({
  form,
  onFieldChange,
  required,
}: FieldsProps & { required?: boolean }) {
  return (
    <Field>
      <FieldLabel htmlFor="term-category">Category (optional)</FieldLabel>
      <Input
        id="term-category"
        value={form.category}
        onChange={(event) => onFieldChange("category", event.target.value)}
        placeholder="e.g. Architecture"
        className="text-base"
        required={required}
      />
    </Field>
  );
}

const OPTIONAL_FIELDS = [
  { key: "example", id: "term-example", label: "Example (optional)" },
  { key: "mental_model", id: "term-mental-model", label: "Mental model (optional)" },
  { key: "discussion", id: "term-discussion", label: "In practice (optional)" },
  { key: "anti_example", id: "term-anti-example", label: "Anti-example (optional)" },
  { key: "controversy", id: "term-controversy", label: "Debated (optional)" },
  { key: "note", id: "term-note", label: "Note (optional)" },
] as const;

export function OptionalDetailFields({ form, onFieldChange }: FieldsProps) {
  return (
    <>
      {OPTIONAL_FIELDS.map((field) => (
        <Field key={field.key}>
          <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
          <Textarea
            id={field.id}
            value={form[field.key] ?? ""}
            onChange={(event) => onFieldChange(field.key, event.target.value)}
            className="min-h-20 text-base"
          />
        </Field>
      ))}
    </>
  );
}

export function TermFormFields({
  form,
  onFieldChange,
  canManageRelationships,
  relationshipDrafts,
  onRelationshipDraftsChange,
  collectionTerms,
  sourceTermId,
}: TermFormFieldsProps) {
  return (
    <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
      <Field>
        <FieldLabel htmlFor="term-name">Term</FieldLabel>
        <Input
          id="term-name"
          value={form.term}
          onChange={(event) => onFieldChange("term", event.target.value)}
          placeholder="e.g. Coupling"
          className="text-base"
          required
        />
      </Field>

      <CategoryField form={form} onFieldChange={onFieldChange} />

      <Field>
        <FieldLabel htmlFor="term-definition">Definition</FieldLabel>
        <Textarea
          id="term-definition"
          value={form.definition}
          onChange={(event) => onFieldChange("definition", event.target.value)}
          placeholder="What does this term mean?"
          className="min-h-24 text-base"
          required
        />
      </Field>

      <OptionalDetailFields form={form} onFieldChange={onFieldChange} />

      {canManageRelationships ? (
        <TermRelationshipsEditor
          drafts={relationshipDrafts}
          onChange={onRelationshipDraftsChange}
          collectionTerms={collectionTerms}
          sourceTermId={sourceTermId}
        />
      ) : null}
    </div>
  );
}
