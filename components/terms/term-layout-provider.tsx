"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
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
  layout: TermLayout;
  save: (change: TermLayoutChange) => Promise<boolean>;
};

const TermLayoutContext = createContext<TermLayoutContextValue | null>(null);

function applyChange(layout: TermLayout, change: TermLayoutChange): TermLayout {
  if (change.scope === "reset-collection")
    return withoutCollectionPlacement(layout, change.domainId);
  const placement = parsePlacement(change.placement);
  if (!placement) return layout;
  return change.scope === "default"
    ? withDefaultPlacement(layout, placement)
    : withCollectionPlacement(layout, change.domainId, placement);
}

/** Holds the learner's term layout for the study pages. A change shows at once
 *  and is put back if saving fails. */
export function TermLayoutProvider({
  initialLayout,
  children,
}: {
  initialLayout: TermLayout;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const [layout, setLayout] = useState(initialLayout);
  const layoutRef = useRef(layout);

  const save = useCallback(
    async (change: TermLayoutChange) => {
      const before = layoutRef.current;
      const optimistic = applyChange(before, change);
      layoutRef.current = optimistic;
      setLayout(optimistic);

      const result = await saveTermLayoutAction(change);
      if (result.error || !result.layout) {
        layoutRef.current = before;
        setLayout(before);
        toast(result.error ?? "Couldn't save the layout. Try again.", "destructive");
        return false;
      }
      layoutRef.current = result.layout;
      setLayout(result.layout);
      return true;
    },
    [toast],
  );

  const value = useMemo(() => ({ layout, save }), [layout, save]);
  return <TermLayoutContext value={value}>{children}</TermLayoutContext>;
}

/** The layout for a collection's cards, or null outside the study pages. */
export function useTermLayoutScope(domainId: string | undefined) {
  const context = useContext(TermLayoutContext);
  if (!context) return null;
  const placement: Placement = resolvePlacement(context.layout, domainId);
  return {
    placement,
    hasOverride: hasCollectionOverride(context.layout, domainId),
    save: context.save,
  };
}
