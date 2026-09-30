"use client";

import { CheckCheck, History, ThumbsDown, ThumbsUp, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Dialog as AriaDialog, DialogTrigger, Popover } from "react-aria-components";
import { listStoryHistoryAction } from "@/app/(private)/jargon/read/stories/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";
import { storyMetaLabels } from "@/lib/stories/meta";
import type { StorySummary } from "@/lib/stories/types";

type HistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stories: StorySummary[] };

function storyHref(storyId: string, domain: string | null): string {
  const params = new URLSearchParams({ story: storyId });
  if (domain) params.set("domain", domain);
  return `/jargon/read/stories?${params.toString()}`;
}

function VoteIcon({ vote }: { vote: StorySummary["vote"] }) {
  if (vote === 1) {
    return <ThumbsUp className="size-4 text-primary" aria-label="Liked" strokeWidth={1.5} />;
  }
  if (vote === -1) {
    return (
      <ThumbsDown className="size-4 text-base-content/50" aria-label="Disliked" strokeWidth={1.5} />
    );
  }
  return null;
}

function HistoryRow({
  story,
  href,
  isCurrent,
  onOpen,
}: {
  story: StorySummary;
  href: string;
  isCurrent: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onOpen}
        aria-current={isCurrent ? "true" : undefined}
        className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 shadow-[inset_2px_0_0_transparent] outline-none hover:bg-base-200 focus-visible:bg-base-200 aria-[current=true]:bg-primary/10 aria-[current=true]:shadow-[inset_2px_0_0_var(--color-primary)] aria-[current=true]:hover:bg-primary/15"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-base-content">
            {story.title}
          </span>
          <span className="block text-xs text-base-content/60">
            {storyMetaLabels(story).join(" · ")}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <VoteIcon vote={story.vote} />
          {story.readAt ? (
            <CheckCheck className="size-4 text-success" aria-label="Read" strokeWidth={1.5} />
          ) : null}
        </span>
      </Link>
    </li>
  );
}

function HistoryList({
  state,
  currentStoryId,
  domain,
  onOpen,
}: {
  state: HistoryState;
  currentStoryId: string | null;
  domain: string | null;
  onOpen: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className="flex justify-center px-4 py-6">
        <span className="loading loading-spinner loading-sm text-base-content/50" role="status" />
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="m-0 px-4 py-4 text-sm text-error">{state.message}</p>;
  }
  if (state.stories.length === 0) {
    return <p className="m-0 px-4 py-4 text-sm text-base-content/60">No stories yet.</p>;
  }
  return (
    <ul className="m-0 max-h-96 list-none divide-y divide-base-300/60 overflow-y-auto p-0">
      {state.stories.map((story) => (
        <HistoryRow
          key={story.id}
          story={story}
          href={storyHref(story.id, domain)}
          isCurrent={story.id === currentStoryId}
          onOpen={onOpen}
        />
      ))}
    </ul>
  );
}

function HistoryButton({ onPress }: { onPress?: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Story history"
      onPress={onPress}
      className="size-11 shrink-0 text-base-content/70 md:size-9"
    >
      <History className="size-4" aria-hidden strokeWidth={1.5} />
    </Button>
  );
}

/** Lists the latest stories next to the Read options button, on the Stories
 *  tab only. A bottom sheet on phone, a popover on desktop. */
export function StoryHistoryMenu() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPhone = useMediaQuery(PLATFORM_MEDIA.phone, true);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<HistoryState>({ status: "loading" });

  if (!pathname.startsWith("/jargon/read/stories")) return null;

  const domain = searchParams.get("domain");
  const currentStoryId = searchParams.get("story");

  async function load() {
    setState({ status: "loading" });
    const result = await listStoryHistoryAction();
    setState(
      "error" in result
        ? { status: "error", message: result.error }
        : { status: "ready", stories: result.stories },
    );
  }

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) void load();
  }

  const list = (
    <HistoryList
      state={state}
      currentStoryId={currentStoryId}
      domain={domain}
      onOpen={() => setOpen(false)}
    />
  );

  if (!isPhone) {
    return (
      <DialogTrigger isOpen={open} onOpenChange={changeOpen}>
        <HistoryButton />
        <Popover
          placement="bottom end"
          offset={6}
          className="dropdown-content z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-box bg-base-100 shadow-md ring-1 ring-base-content/10"
        >
          <AriaDialog aria-label="Story history" className="outline-none">
            <p className="m-0 border-b border-base-300/60 px-4 py-2.5 text-sm font-medium">
              Recent stories
            </p>
            {list}
          </AriaDialog>
        </Popover>
      </DialogTrigger>
    );
  }

  return (
    <>
      <HistoryButton onPress={() => changeOpen(true)} />
      <Sheet
        isOpen={open}
        onOpenChange={changeOpen}
        side="bottom"
        showCloseButton={false}
        className="max-h-[min(36rem,85dvh)] rounded-t-2xl pb-safe"
      >
        <SheetHeader className="border-b border-base-300 px-4 py-3">
          <div className="flex items-center gap-1">
            <SheetTitle className="min-w-0 flex-1">Recent stories</SheetTitle>
            <SheetClose className="shrink-0">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </SheetHeader>
        {list}
      </Sheet>
    </>
  );
}
