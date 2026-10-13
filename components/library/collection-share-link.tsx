"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/track";
import { shareLink } from "@/lib/collections/share";
import type { Collection } from "@/lib/terms/types";

export const SHARE_ICON_BUTTON_CLASS =
  "min-h-11 min-w-11 text-base-content/70 hover:text-base-content md:min-h-8 md:min-w-8";

const noSubscribe = () => () => {};
const canShareNatively = () => typeof navigator.share === "function";

/** Copies the collection's link and says so in a toast. */
export async function copyCollectionLink(
  collection: Pick<Collection, "id" | "publicSlug">,
  toast: ReturnType<typeof useToast>["toast"],
  owner: boolean,
) {
  try {
    await navigator.clipboard.writeText(shareLink(collection));
    track("share_link_copied", { owner });
    return true;
  } catch {
    toast("Couldn't copy the link. Try again.", "destructive");
    return false;
  }
}

export function ShareLink({ collection }: { collection: Collection }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const nativeShare = useSyncExternalStore(noSubscribe, canShareNatively, () => false);
  const link = shareLink(collection);

  async function copy() {
    if (!(await copyCollectionLink(collection, toast, true))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({ title: collection.name, url: link });
      track("share_native");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast("Couldn't open sharing. Copy the link instead.", "destructive");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          readOnly
          value={link}
          aria-label="Link to this collection"
          className="min-h-11 min-w-0 flex-1 md:min-h-9"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          variant="outline"
          className="min-h-11 shrink-0 gap-1.5 md:min-h-9"
          onPress={() => void copy()}
        >
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {nativeShare ? (
        <Button className="min-h-11 gap-1.5 md:min-h-9" onPress={() => void share()}>
          <Share2 className="size-4" aria-hidden />
          Share…
        </Button>
      ) : null}
    </div>
  );
}
