"use client";

import { Lightbulb, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { useHints } from "@/components/jargon/hint-context";
import { dismissHint, isHintCoolingDown, snoozeHint } from "@/lib/hints/hint-storage";
import type { NextBestActionHint } from "@/lib/smart-queue/next-best-action";

function firstAvailableHint(
  hints: NextBestActionHint[],
  dismissedIds: Set<string>,
): NextBestActionHint | null {
  return hints.find((hint) => !dismissedIds.has(hint.id) && !isHintCoolingDown(hint.id)) ?? null;
}

export function NextBestActionCard() {
  const hints = useHints();
  const [mounted, setMounted] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  const hint = useMemo(
    () => (mounted ? firstAvailableHint(hints, dismissedIds) : null),
    [mounted, hints, dismissedIds],
  );

  if (!hint) return null;

  const visible = hint;

  function handleDismiss() {
    dismissHint(visible.id);
    setDismissedIds((prev) => new Set(prev).add(visible.id));
  }

  function handleSnooze() {
    snoozeHint(visible.id);
    setDismissedIds((prev) => new Set(prev).add(visible.id));
  }

  return (
    <aside className="rounded-xl bg-primary/[0.06] p-3 md:hidden">
      <div className="flex items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="size-3.5" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs text-base-content/60">Do this next</p>
          <p className="mt-0.5 m-0 text-sm font-medium text-pretty">{visible.message}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onPress={handleDismiss}
          aria-label="Dismiss"
          className="min-h-11 min-w-11 shrink-0"
        >
          <X className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
      <div className="mt-2 flex gap-2">
        <Button variant="ghost" size="sm" onPress={handleSnooze} className="min-h-11 flex-1">
          Later
        </Button>
        <LinkButton href={visible.ctaHref} size="sm" className="min-h-11 flex-1">
          {visible.actionLabel}
        </LinkButton>
      </div>
    </aside>
  );
}
