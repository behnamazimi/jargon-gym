import { ChevronDown } from "lucide-react";
import type { CaptureTerm } from "@/app/(private)/jargon/capture/actions";
import { CategoryField, OptionalDetailFields } from "@/components/jargon/term-form-fields";
import { TermRelationshipsEditor } from "@/components/jargon/term-relationships-editor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CAPTURE_COPY } from "@/lib/jargon/capture/copy";
import type { RelationshipDraft } from "@/lib/jargon/relationship-schema";
import type { TermFormValues } from "@/lib/jargon/term-schema";
import { cn } from "@/lib/utils";

/** Everything beyond term and definition, tucked away until asked for. */
export function CaptureDetails({
  form,
  onFieldChange,
  open,
  onOpenChange,
  terms,
  drafts,
  onDraftsChange,
}: {
  form: TermFormValues;
  onFieldChange: <K extends keyof TermFormValues>(key: K, value: TermFormValues[K]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terms: CaptureTerm[];
  drafts: RelationshipDraft[];
  onDraftsChange: (drafts: RelationshipDraft[]) => void;
}) {
  return (
    <Collapsible isExpanded={open} onExpandedChange={onOpenChange}>
      <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm">
        <span>
          <span className="font-medium">{CAPTURE_COPY.moreDetails}</span>
          <span className="block text-xs text-base-content/70">{CAPTURE_COPY.moreDetailsHint}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-base-content/70 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
          strokeWidth={1.5}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 pt-2">
          <CategoryField form={form} onFieldChange={onFieldChange} />
          <OptionalDetailFields form={form} onFieldChange={onFieldChange} />
          {terms.length > 0 ? (
            <TermRelationshipsEditor
              drafts={drafts}
              onChange={onDraftsChange}
              domainTerms={terms}
              sourceTermId={undefined}
            />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
