"use client";

import { createContext, use, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  saveTermLayoutAction,
  type TermLayoutChange,
} from "@/app/(private)/app/term-layout-actions";
import { useToast } from "@/components/ui/toast";
import {
  hasCollectionOverride,
  resolvePlacement,
  withCollectionPlacement,
  withDefaultPlacement,
  withoutCollectionPlacement,
  parsePlacement,
  type Placement,
  type TermLayout,
} from "@/lib/terms/term-layout";

type TermLayoutContextValue = {
  stored: Promise<TermLayout>;
  /** What the learner has saved or is saving since the page loaded. */
  changed: TermLayout | null;
  save: (change: TermLayoutChange) => Promise<boolean>;
};

const TermLayoutContext = createContext<TermLayoutContextValue | null>(null);

function applyChange(layout: TermLayout, change: TermLayoutChange): TermLayout {
  if (change.scope === "reset-collection") {
    return withoutCollectionPlacement(layout, change.domainId);
  }
  const placement = parsePlacement(change.placement);
  if (!placement) return layout;
  return change.scope === "default"
    ? withDefaultPlacement(layout, placement)
    : withCollectionPlacement(layout, change.domainId, placement);
}

/** Holds the learner's term layout for the study pages. It takes the layout as
 *  a promise so the page doesn't wait for it; the cards read it where they
 *  show a term. A change shows at once and is put back if saving fails. */
export function TermLayoutProvider({
  initialLayout,
  children,
}: {
  initialLayout: Promise<TermLayout>;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const [changed, setChanged] = useState<TermLayout | null>(null);
  const changedRef = useRef<TermLayout | null>(null);

  const save = useCallback(
    async (change: TermLayoutChange) => {
      const before = changedRef.current ?? (await initialLayout);
      const optimistic = applyChange(before, change);
      changedRef.current = optimistic;
      setChanged(optimistic);

      const result = await saveTermLayoutAction(change);
      if (result.error || !result.layout) {
        changedRef.current = before;
        setChanged(before);
        toast(result.error ?? "Couldn't save the layout. Try again.", "destructive");
        return false;
      }
      changedRef.current = result.layout;
      setChanged(result.layout);
      return true;
    },
    [initialLayout, toast],
  );

  const value = useMemo(
    () => ({ stored: initialLayout, changed, save }),
    [initialLayout, changed, save],
  );
  return <TermLayoutContext value={value}>{children}</TermLayoutContext>;
}

export type TermLayoutAccess = {
  placement: Placement;
  hasOverride: boolean;
  save: (change: TermLayoutChange) => Promise<boolean>;
};

/** The layout for a collection's cards, or null outside the study pages.
 *  Suspends until the layout has loaded, so call it under a Suspense boundary. */
export function useTermLayoutScope(domainId: string | undefined): TermLayoutAccess | null {
  const context = useContext(TermLayoutContext);
  if (!context) return null;
  const stored = use(context.stored);
  const layout = context.changed ?? stored;
  return {
    placement: resolvePlacement(layout, domainId),
    hasOverride: hasCollectionOverride(layout, domainId),
    save: context.save,
  };
}
