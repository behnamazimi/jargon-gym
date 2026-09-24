"use client";

import { Scale } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type EvalResult = {
  schemaFit: number;
  plain: boolean;
};

type Status = "idle" | "loading" | "done" | "error";

function parseEvalResult(value: unknown): EvalResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.schemaFit !== "number" || !Number.isFinite(record.schemaFit)) return null;
  if (typeof record.plain !== "boolean") return null;
  return { schemaFit: record.schemaFit, plain: record.plain };
}

export function TermEvalButton({ termId }: { termId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<EvalResult | null>(null);
  const showScore = status === "done" && result != null;

  async function onEvaluate() {
    if (status === "loading" || status === "done") return;
    setStatus("loading");
    setResult(null);
    try {
      const response = await fetch(`/api/jargon/terms/${termId}/evaluate`, { method: "POST" });
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const parsed = parseEvalResult(await response.json());
      if (!parsed) {
        setStatus("error");
        return;
      }
      setResult(parsed);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const scoreText = showScore ? result.schemaFit.toFixed(2) : null;

  return (
    <div
      className={
        showScore
          ? "absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-full bg-base-100 py-0.5 ps-2.5 pe-0.5"
          : "absolute right-3 bottom-3 z-10"
      }
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      {showScore ? (
        <span
          className={
            result.plain
              ? "text-sm font-medium tabular-nums text-base-content"
              : "text-sm font-medium tabular-nums text-warning"
          }
        >
          {scoreText}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={scoreText ? `Schema fit ${scoreText}` : "Evaluate this term"}
        isDisabled={status === "loading"}
        onPress={() => {
          void onEvaluate();
        }}
        className="min-h-11 min-w-11 bg-base-100"
      >
        <Scale className="size-4" aria-hidden strokeWidth={1.5} />
      </Button>
    </div>
  );
}
