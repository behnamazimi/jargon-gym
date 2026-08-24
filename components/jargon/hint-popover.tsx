"use client";

import { Lightbulb, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import {
  dismissHint,
  markHintShownThisSession,
  selectVisibleHint,
  snoozeHint,
} from "@/lib/hints/hint-storage";
import type { NextBestActionHint } from "@/lib/smart-queue/next-best-action";
import type { PickContext } from "@/lib/smart-queue/types";

type HintPopoverProps = {
  hints: NextBestActionHint[];
};

const CONTEXT_SUPPRESSED_ON_PREFIX: Record<PickContext, string> = {
  read: "/jargon/read",
  review: "/jargon/review",
  quiz: "/jargon/quiz",
};

const HIDDEN_PATH_PREFIXES = [
  "/jargon/settings",
  "/jargon/debug",
  "/jargon/browse",
  "/jargon/import",
];

function isHiddenOnPath(pathname: string): boolean {
  return HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isSuppressedOnPath(hint: NextBestActionHint, pathname: string): boolean {
  return pathname.startsWith(CONTEXT_SUPPRESSED_ON_PREFIX[hint.context]);
}

export function HintPopover({ hints }: HintPopoverProps) {
  const pathname = usePathname();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // Storage-backed checks (hasShownHintThisSession, isHintCoolingDown) only
  // exist in the browser — reading them straight from useMemo on the very
  // first client render (before hydration settles) can disagree with the
  // server-rendered HTML, which never sees this flag and always renders as
  // if nothing was shown yet. That mismatch is exactly what shows the hint
  // for a frame and then hides it. Deferring the storage read to after
  // mount keeps the first client render identical to the server's.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleHint = useMemo(() => {
    if (!mounted) return null;
    if (isHiddenOnPath(pathname)) return null;

    return selectVisibleHint(hints, dismissedIds, (hint) => isSuppressedOnPath(hint, pathname));
  }, [mounted, hints, pathname, dismissedIds]);

  useEffect(() => {
    if (visibleHint) {
      markHintShownThisSession();
    }
  }, [visibleHint]);

  if (!visibleHint) return null;

  const hint = visibleHint;

  function handleDismiss() {
    dismissHint(hint.id);
    setDismissedIds((prev) => new Set(prev).add(hint.id));
  }

  function handleSnooze() {
    snoozeHint(hint.id);
    setDismissedIds((prev) => new Set(prev).add(hint.id));
  }

  return (
    <div className="toast toast-bottom toast-start z-40 max-md:hidden">
      <Card className="w-80 shadow-lg">
        <CardContent className="gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Lightbulb className="text-primary h-4 w-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base-content/60 text-xs">Suggested for you</p>
              <p className="text-sm font-medium text-pretty">{hint.message}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onPress={handleDismiss}
              aria-label="Dismiss"
              className="shrink-0"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-end pt-0">
          <Button variant="ghost" size="xs" onPress={handleSnooze}>
            Remind me later
          </Button>
          <LinkButton href={hint.ctaHref} size="sm">
            {hint.actionLabel}
          </LinkButton>
        </CardFooter>
      </Card>
    </div>
  );
}
