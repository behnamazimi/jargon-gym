import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TermRelationshipsEditor } from "@/components/jargon/term-relationships-editor";
import type { RelationshipDraft } from "@/lib/jargon/relationship-schema";
import type { TermInput } from "@/lib/jargon/term-schema";
import type { Term } from "@/lib/jargon/types";

type TermFormFieldsProps = {
  form: TermInput;
  onFieldChange: <K extends keyof TermInput>(key: K, value: TermInput[K]) => void;
  canManageRelationships: boolean;
  relationshipDrafts: RelationshipDraft[];
  onRelationshipDraftsChange: (drafts: RelationshipDraft[]) => void;
  domainTerms: Term[];
  sourceTermId: string | undefined;
};

export function TermFormFields({
  form,
  onFieldChange,
  canManageRelationships,
  relationshipDrafts,
  onRelationshipDraftsChange,
  domainTerms,
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
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="term-category">Category</FieldLabel>
        <Input
          id="term-category"
          value={form.category}
          onChange={(event) => onFieldChange("category", event.target.value)}
          placeholder="e.g. Architecture"
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="term-definition">Definition</FieldLabel>
        <Textarea
          id="term-definition"
          value={form.definition}
          onChange={(event) => onFieldChange("definition", event.target.value)}
          placeholder="What does this term mean?"
          className="min-h-24"
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="term-example">Example (optional)</FieldLabel>
        <Textarea
          id="term-example"
          value={form.example ?? ""}
          onChange={(event) => onFieldChange("example", event.target.value)}
          className="min-h-20"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="term-mental-model">Mental model (optional)</FieldLabel>
        <Textarea
          id="term-mental-model"
          value={form.mental_model ?? ""}
          onChange={(event) => onFieldChange("mental_model", event.target.value)}
          className="min-h-20"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="term-discussion">In practice (optional)</FieldLabel>
        <Textarea
          id="term-discussion"
          value={form.discussion ?? ""}
          onChange={(event) => onFieldChange("discussion", event.target.value)}
          className="min-h-20"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="term-anti-example">Anti-example (optional)</FieldLabel>
        <Textarea
          id="term-anti-example"
          value={form.anti_example ?? ""}
          onChange={(event) => onFieldChange("anti_example", event.target.value)}
          className="min-h-20"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="term-controversy">Debated (optional)</FieldLabel>
        <Textarea
          id="term-controversy"
          value={form.controversy ?? ""}
          onChange={(event) => onFieldChange("controversy", event.target.value)}
          className="min-h-20"
        />
      </Field>

      {canManageRelationships ? (
        <TermRelationshipsEditor
          drafts={relationshipDrafts}
          onChange={onRelationshipDraftsChange}
          domainTerms={domainTerms}
          sourceTermId={sourceTermId}
        />
      ) : null}
    </div>
  );
}
