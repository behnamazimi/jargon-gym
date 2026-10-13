"use client";

import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Collection } from "@/lib/terms/types";
import { copyCollectionLink, SHARE_ICON_BUTTON_CLASS } from "./collection-share-sheet";

/** For collections someone else owns: copies the link without opening anything. */
export function CopyCollectionLinkButton({ collection }: { collection: Collection }) {
  const { toast } = useToast();

  async function copy() {
    if (await copyCollectionLink(collection, toast, false)) toast("Link copied");
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={SHARE_ICON_BUTTON_CLASS}
      aria-label="Copy link"
      onPress={() => void copy()}
    >
      <Link2 className="size-5" />
    </Button>
  );
}
