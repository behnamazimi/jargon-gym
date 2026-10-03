"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import type { SharedDomain } from "@/lib/terms/types";
import { pluralize } from "@/lib/utils";

export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; query: string; domains: SharedDomain[] };

export function SearchResults({
  state,
  addingId,
  addedIds,
  onAdd,
  hideWhenEmpty = false,
  noMatchMessage,
}: {
  state: SearchState;
  addingId: string | null;
  addedIds: string[];
  onAdd: (domainId: string) => void;
  /** The request form shows close matches only when there are some. */
  hideWhenEmpty?: boolean;
  noMatchMessage?: (query: string) => string;
}) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return <p className="m-0 text-sm text-base-content/70">Searching…</p>;
  }
  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn&apos;t search right now. Try again.</AlertDescription>
      </Alert>
    );
  }
  if (state.domains.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <p className="m-0 text-sm text-base-content/70" role="status">
        {noMatchMessage
          ? noMatchMessage(state.query)
          : `Nothing shared matches “${state.query}”. Try a list, or start an empty collection.`}
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {state.domains.map((domain) => {
        const added = domain.inCollection || addedIds.includes(domain.id);
        return (
          <li
            key={domain.id}
            className="shadow-surface flex items-center gap-3 rounded-field bg-base-100 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate font-medium">{domain.name}</p>
              <p className="m-0 text-sm text-base-content/70">
                {pluralize(domain.termCount, "term")} · Shared
              </p>
            </div>
            {added ? (
              <LinkButton
                href={`/jargon?domain=${domain.id}`}
                variant="outline"
                size="sm"
                className="min-h-11 md:min-h-8"
              >
                Added · Open
              </LinkButton>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 md:min-h-8"
                isDisabled={addingId === domain.id}
                onPress={() => onAdd(domain.id)}
              >
                {addingId === domain.id ? "Adding…" : "Add"}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
