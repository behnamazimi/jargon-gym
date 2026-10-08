"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  Suspense,
  use,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
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

// The editor is only needed once someone asks for it.
const loadEditor = () => import("./term-layout-dialog").then((module) => module.TermLayoutDialog);
const TermLayoutDialog = dynamic(loadEditor, { ssr: false });

export function preloadTermLayoutEditor() {
  void loadEditor();
}

type TermLayoutContextValue = {
  stored: Promise<TermLayout>;
  openEditor: (collectionId: string | undefined) => void;
  /** What the learner has saved or is saving since the page loaded. */
  changed: TermLayout | null;
  save: (change: TermLayoutChange) => Promise<boolean>;
};

const TermLayoutContext = createContext<TermLayoutContextValue | null>(null);

function applyChange(layout: TermLayout, change: TermLayoutChange): TermLayout {
  if (change.scope === "reset-collection") {
    return withoutCollectionPlacement(layout, change.collectionId);
  }
  const placement = parsePlacement(change.placement);
  if (!placement) return layout;
  return change.scope === "default"
    ? withDefaultPlacement(layout, placement)
    : withCollectionPlacement(layout, change.collectionId, placement);
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
  const [editor, setEditor] = useState<{
    collectionId: string | undefined;
    id: number;
    isOpen: boolean;
  } | null>(null);

  const openEditor = useCallback((collectionId: string | undefined) => {
    setEditor((previous) => ({ collectionId, id: (previous?.id ?? 0) + 1, isOpen: true }));
  }, []);

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
    () => ({ stored: initialLayout, changed, save, openEditor }),
    [initialLayout, changed, save, openEditor],
  );
  return (
    <TermLayoutContext value={value}>
      {children}
      {editor ? (
        <Suspense fallback={null}>
          <EditorHost
            key={editor.id}
            collectionId={editor.collectionId}
            isOpen={editor.isOpen}
            onOpenChange={(isOpen) => setEditor((current) => current && { ...current, isOpen })}
          />
        </Suspense>
      ) : null}
    </TermLayoutContext>
  );
}

export type TermLayoutAccess = {
  placement: Placement;
  hasOverride: boolean;
  save: (change: TermLayoutChange) => Promise<boolean>;
  openEditor: (collectionId: string | undefined) => void;
};

/** The layout for a collection's cards, or null outside the study pages.
 *  Suspends until the layout has loaded, so call it under a Suspense boundary. */
export function useTermLayoutScope(collectionId: string | undefined): TermLayoutAccess | null {
  const context = useContext(TermLayoutContext);
  if (!context) return null;
  const stored = use(context.stored);
  const layout = context.changed ?? stored;
  return {
    placement: resolvePlacement(layout, collectionId),
    hasOverride: hasCollectionOverride(layout, collectionId),
    save: context.save,
    openEditor: context.openEditor,
  };
}

/** The editor lives here, above the cards, so its events never pass through a
 *  card's own handlers. */
function EditorHost({
  collectionId,
  isOpen,
  onOpenChange,
}: {
  collectionId: string | undefined;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const access = useTermLayoutScope(collectionId);
  if (!access) return null;
  return (
    <TermLayoutDialog
      collectionId={collectionId}
      access={access}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    />
  );
}
