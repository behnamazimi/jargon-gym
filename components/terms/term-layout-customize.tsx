"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTermLayoutScope } from "./term-layout-provider";

// The editor is only needed once someone asks for it.
const loadDialog = () => import("./term-layout-dialog").then((module) => module.TermLayoutDialog);
const TermLayoutDialog = dynamic(loadDialog, { ssr: false });

/** The one place a learner changes what sits under "More": a quiet text button
 *  under the term that opens the editor. */
export function TermLayoutCustomize({ domainId }: { domainId: string | undefined }) {
  const access = useTermLayoutScope(domainId);
  const [opens, setOpens] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  if (!access) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="xs"
        className="font-normal text-base-content/60 hover:text-base-content"
        onHoverStart={() => void loadDialog()}
        onFocus={() => void loadDialog()}
        onPress={() => {
          setOpens((count) => count + 1);
          setIsOpen(true);
        }}
      >
        Customize
      </Button>
      {opens > 0 ? (
        <TermLayoutDialog
          key={opens}
          domainId={domainId}
          access={access}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
        />
      ) : null}
    </>
  );
}
