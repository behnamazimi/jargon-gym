import { CollectionSelect } from "@/components/jargon/collection-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OwnedCollectionForImport } from "@/lib/jargon/import/owned-collections";
import {
  DEFAULT_COUNT,
  NEW_COLLECTION_KEY,
} from "@/components/jargon/import/import-llm-prompt-helpers";

type ImportLlmPromptFieldsProps = {
  collections: OwnedCollectionForImport[];
  selectedCollectionId: string;
  onCollectionChange: (key: string) => void;
  domain: string;
  onDomainChange: (value: string) => void;
  count: string;
  onCountChange: (value: string) => void;
  exclude: string;
  onExcludeChange: (value: string) => void;
};

export function ImportLlmPromptFields({
  collections,
  selectedCollectionId,
  onCollectionChange,
  domain,
  onDomainChange,
  count,
  onCountChange,
  exclude,
  onExcludeChange,
}: ImportLlmPromptFieldsProps) {
  return (
    <div className="space-y-3">
      {collections.length > 0 ? (
        <Field>
          <FieldLabel htmlFor="import-skill-collection">Add to collection</FieldLabel>
          <CollectionSelect
            mode="local"
            id="import-skill-collection"
            className="w-full"
            triggerClassName="w-full text-sm"
            collections={collections.map((collection) => ({
              id: collection.id,
              name: collection.name,
              termCount: collection.terms.length > 0 ? collection.terms.length : undefined,
            }))}
            value={selectedCollectionId}
            leadingOption={{ id: NEW_COLLECTION_KEY, label: "New collection" }}
            onChange={onCollectionChange}
          />
        </Field>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem]">
        <Field>
          <FieldLabel htmlFor="import-skill-domain">Collection name</FieldLabel>
          <Input
            id="import-skill-domain"
            type="text"
            value={domain}
            onChange={(event) => onDomainChange(event.target.value)}
            placeholder="e.g. Product Management"
            className="text-sm"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="import-skill-count">Count</FieldLabel>
          <Input
            id="import-skill-count"
            type="text"
            inputMode="numeric"
            value={count}
            onChange={(event) => onCountChange(event.target.value)}
            placeholder={String(DEFAULT_COUNT)}
            className="text-sm tabular-nums"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="import-skill-exclude">Exclude terms</FieldLabel>
        <Textarea
          id="import-skill-exclude"
          value={exclude}
          onChange={(event) => onExcludeChange(event.target.value)}
          placeholder="e.g. Agile, Scrum, OKR"
          rows={2}
          className="min-h-11 text-sm"
        />
      </Field>
    </div>
  );
}
