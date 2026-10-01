"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ImportFlowState } from "@/components/jargon/import/use-import-flow";
import { pluralize } from "@/lib/utils";

export function ConflictChooser({ flow }: { flow: ImportFlowState }) {
  const conflicts = (flow.built?.conflicts ?? []).filter(
    (conflict) => !flow.resolved.includes(conflict.termId),
  );
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-2">
      {conflicts.map((conflict) => (
        <Alert key={conflict.termId}>
          <AlertDescription role="status" className="space-y-2">
            <p className="m-0 font-medium">
              &ldquo;{conflict.term}&rdquo; appears twice with different definitions. Keep which?
            </p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {conflict.definitions.map((definition, index) => (
                <li key={`${conflict.termId}-${index}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-11 w-full justify-between gap-2 py-2 text-left whitespace-normal"
                    onPress={() => flow.chooseDefinition(conflict.termId, definition)}
                  >
                    <span className="line-clamp-2">{definition ?? "No definition"}</span>
                    <span className="shrink-0 text-xs">Keep this one</span>
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

export function DuplicatePolicy({ flow }: { flow: ImportFlowState }) {
  const count = flow.summary.alreadyThere;
  if (count === 0) return null;
  const name = flow.existing?.name ?? "this collection";

  return (
    <div className="space-y-2 rounded-xl bg-warning/10 p-3">
      <p className="m-0 text-sm font-medium" role="status">
        {pluralize(count, "term")} {count === 1 ? "is" : "are"} already in {name}
      </p>
      <ToggleGroup
        aria-label="What to do with terms already there"
        selectionMode="single"
        disallowEmptySelection
        variant="outline"
        selectedKeys={[flow.check.policy]}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          if (key === "skip" || key === "update") flow.setPolicy(key);
        }}
        className="flex-wrap"
      >
        <ToggleGroupItem id="skip" className="min-h-11">
          Skip them
        </ToggleGroupItem>
        <ToggleGroupItem id="update" className="min-h-11">
          Update their definitions
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="m-0 text-xs text-base-content/60">
        Updating keeps your progress and never replaces a definition with an empty one. Different
        meaning? Add a qualifier, like &ldquo;SLA (legal)&rdquo;.
      </p>
    </div>
  );
}

export function Notices({ flow }: { flow: ImportFlowState }) {
  const notes: string[] = [];
  const collapsed = flow.built?.collapsed ?? 0;
  const withoutTerm = flow.built?.withoutTerm ?? 0;
  if (collapsed) notes.push(`Combined ${collapsed} repeated rows.`);
  if (withoutTerm) {
    notes.push(
      `${pluralize(withoutTerm, "line")} had no term and ${withoutTerm === 1 ? "was" : "were"} left out.`,
    );
  }
  if (notes.length === 0) return null;
  return (
    <p className="m-0 text-sm text-base-content/60" role="status">
      {notes.join(" ")}
    </p>
  );
}
