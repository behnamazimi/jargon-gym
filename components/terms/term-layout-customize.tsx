"use client";

import { Button } from "@/components/ui/button";
import { preloadTermLayoutEditor, useTermLayoutScope } from "./term-layout-provider";

/** The one place a learner changes what sits under "More": a quiet text button
 *  under the term that opens the editor. */
export function TermLayoutCustomize({ domainId }: { domainId: string | undefined }) {
  const access = useTermLayoutScope(domainId);
  if (!access) return null;

  return (
    <Button
      variant="ghost"
      size="xs"
      className="font-normal text-base-content/60 hover:text-base-content"
      onHoverStart={preloadTermLayoutEditor}
      onFocus={preloadTermLayoutEditor}
      onPress={() => access.openEditor(domainId)}
    >
      Customize
    </Button>
  );
}
