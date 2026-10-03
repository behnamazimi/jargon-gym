import type { Dispatch, SetStateAction } from "react";
import type { CheckAction, DuplicatePolicy } from "@/lib/import/check-state";

type Setters = {
  dispatch: Dispatch<CheckAction>;
  setLastRemoved: Dispatch<SetStateAction<string | null>>;
  setResolved: Dispatch<SetStateAction<string[]>>;
  newImportId: () => string;
};

/** What a person can do to the cards on Check. Each change gets a new import id,
 *  so a retry of an unchanged list is the only thing that can repeat one. */
export function checkActions({ dispatch, setLastRemoved, setResolved, newImportId }: Setters) {
  return {
    removeCard: (id: string) => {
      setLastRemoved(id);
      dispatch({ type: "remove", id, importId: newImportId() });
    },
    restoreCard: (id: string) => {
      setLastRemoved(null);
      dispatch({ type: "restore", id, importId: newImportId() });
    },
    chooseDefinition: (termId: string, definition: string | null) => {
      dispatch({ type: "edit", id: termId, patch: { definition }, importId: newImportId() });
      setResolved((current) => [...current, termId]);
    },
    setPolicy: (policy: DuplicatePolicy) =>
      dispatch({ type: "setPolicy", policy, importId: newImportId() }),
    setOverride: (id: string, policy: DuplicatePolicy | null) =>
      dispatch({ type: "setOverride", id, policy, importId: newImportId() }),
    setCategory: (category: string) =>
      dispatch({ type: "setCategory", category, importId: newImportId() }),
  };
}
