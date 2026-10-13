"use client";

import { Share2, XIcon } from "lucide-react";
import { useState } from "react";
import {
  getCollectionSubscriberCount,
  shareCollection,
  unshareCollection,
} from "@/app/(private)/app/actions";
import { OptionRow } from "@/components/read/read-option-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-platform";
import { ownerNoticeFor } from "@/lib/collections/moderation";
import { PLATFORM_MEDIA } from "@/lib/platform";
import type { Collection } from "@/lib/terms/types";
import { SHARE_ICON_BUTTON_CLASS, ShareLink } from "./collection-share-link";

const SHARED_HINTS = [
  "Lobyas members see it in Browse, under Community.",
  "Anyone with the link sees its name, description and a few terms, and can add it after logging in.",
  "People who add it see your edits, not your progress.",
];

function stopSharingMessage(count: number) {
  if (count === 0) return "It leaves Browse and the link stops working.";
  const who = count === 1 ? "1 person has" : `${count} people have`;
  return `${who} added this collection. Stopping removes it from their libraries, and the link stops working.`;
}

/** The owner's Share button: a bottom sheet on phone and a dialog on larger screens. */
export function CollectionShareButton({ collection }: { collection: Collection }) {
  const [open, setOpen] = useState(false);
  // What the sheet last saved, so reopening it before the page refresh lands doesn't show the old state.
  const [saved, setSaved] = useState<{ id: string; shared: boolean } | null>(null);
  const shared = saved?.id === collection.id ? saved.shared : collection.visibility === "shared";

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className={SHARE_ICON_BUTTON_CLASS}
        aria-label="Share collection"
        onPress={() => setOpen(true)}
      >
        <Share2 className="size-5" />
      </Button>
      {open ? (
        <ShareSurface
          collection={collection}
          initialShared={shared}
          onSaved={(next) => setSaved({ id: collection.id, shared: next })}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

type ShareBodyProps = {
  collection: Collection;
  initialShared: boolean;
  onSaved: (shared: boolean) => void;
};

function ShareSurface({ onClose, ...props }: ShareBodyProps & { onClose: () => void }) {
  const isPhone = useMediaQuery(PLATFORM_MEDIA.phone, true);
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };
  const title = "Share collection";
  const body = <ShareBody {...props} />;

  return isPhone ? (
    <Sheet
      isOpen
      onOpenChange={onOpenChange}
      side="bottom"
      showCloseButton={false}
      className="max-h-[min(40rem,90dvh)] rounded-t-2xl pb-safe"
    >
      <SheetHeader className="shrink-0 border-b border-base-300 px-4 py-3">
        <div className="flex items-center gap-1">
          <SheetTitle className="min-w-0 flex-1">{title}</SheetTitle>
          <SheetClose className="shrink-0">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
      </SheetHeader>
      {body}
    </Sheet>
  ) : (
    <Dialog isOpen onOpenChange={onOpenChange} className="max-w-md gap-0 p-0">
      <div className="flex min-h-0 flex-col">
        <div className="shrink-0 border-b border-base-300 py-3 ps-4 pe-12">
          <DialogTitle>{title}</DialogTitle>
        </div>
        {body}
      </div>
    </Dialog>
  );
}

type SubscriberCount = number | "loading" | "error";

function ShareBody({ collection, initialShared, onSaved }: ShareBodyProps) {
  // The sheet keeps its own copy: the page catches up when the action's refresh lands.
  const [shared, setShared] = useState(initialShared);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [subscribers, setSubscribers] = useState<SubscriberCount>("loading");
  const [focusSwitch, setFocusSwitch] = useState(false);
  const blocked = collection.shareBlockedReason !== null;

  async function setSharing(next: boolean) {
    setError(null);
    setBusy(true);
    setShared(next);
    let failure: string | null;
    try {
      const result = await (next ? shareCollection : unshareCollection)(collection.id);
      failure = result.error ?? null;
    } catch {
      failure = "Couldn't save that. Check your connection and try again.";
    }
    setBusy(false);
    if (failure) {
      setShared(!next);
      setError(failure);
    } else {
      onSaved(next);
    }
  }

  function closeConfirm() {
    setConfirming(false);
    setFocusSwitch(true);
  }

  function askToStop() {
    setError(null);
    setConfirming(true);
    setSubscribers("loading");
    getCollectionSubscriberCount(collection.id)
      .then((result) => setSubscribers(result.count ?? "error"))
      .catch(() => setSubscribers("error"));
  }

  async function stop() {
    await setSharing(false);
    closeConfirm();
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1" aria-live="polite">
          <p className="m-0 text-base font-medium">Stop sharing?</p>
          <p className="m-0 text-sm text-base-content/80">
            {subscribers === "loading"
              ? "Checking who else uses this collection…"
              : subscribers === "error"
                ? "Couldn't check who else uses this collection. Try again."
                : stopSharingMessage(subscribers)}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            className="min-h-11 md:min-h-9"
            isDisabled={busy}
            autoFocus
            onPress={closeConfirm}
          >
            Keep sharing
          </Button>
          <Button
            variant="destructive"
            className="min-h-11 md:min-h-9"
            isDisabled={busy || typeof subscribers !== "number"}
            onPress={() => void stop()}
          >
            {busy ? "Stopping…" : "Stop sharing"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-1">
      <ul className="m-0 list-none p-0">
        <OptionRow
          id={`share-${collection.id}`}
          label="Shared"
          description="Let others find this collection and add it to their library."
          disabledNote={blocked ? ownerNoticeFor(collection.shareBlockedReason) : undefined}
          checked={shared}
          disabled={busy}
          autoFocus={focusSwitch}
          onChange={(checked) => (checked ? void setSharing(true) : askToStop())}
        />
      </ul>
      {shared && !blocked ? (
        <div className="px-4 pt-1 pb-3">
          <ShareLink collection={collection} />
          <ul className="mt-4 mb-0 flex list-disc flex-col gap-1.5 ps-5 text-xs text-base-content/70">
            {SHARED_HINTS.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 px-4 pb-3 text-sm text-error-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
