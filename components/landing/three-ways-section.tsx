import { BookOpen, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const WAYS: { icon: LucideIcon; label: string; body: string }[] = [
  {
    icon: Zap,
    label: "Read",
    body: "See a term with real usage, not just a definition.",
  },
  {
    icon: BookOpen,
    label: "Review",
    body: "Confirm what you know. Terms you're shaky on come up first.",
  },
  {
    icon: Sparkles,
    label: "Quiz",
    body: "A real check on known terms, no daily streak to babysit.",
  },
];

function WaysInGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {WAYS.map(({ icon: Icon, label, body }, index) => (
        <div
          key={label}
          className={cn(
            "relative overflow-hidden rounded-2xl bg-base-100 p-5 shadow-surface ring-1 ring-base-content/5",
            index === 1 && "sm:translate-y-4",
          )}
        >
          <span
            aria-hidden
            className="font-heading pointer-events-none absolute -top-3 -right-1 text-6xl font-bold text-base-content/[0.05]"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <Icon aria-hidden className="relative size-5 text-primary" strokeWidth={1.75} />
          <p className="relative m-0 mt-3 text-sm font-semibold text-base-content">{label}</p>
          <p className="relative m-0 mt-1 text-sm leading-relaxed text-base-content/75">{body}</p>
        </div>
      ))}
    </div>
  );
}

export function ThreeWaysSection() {
  return (
    <div>
      <h2 className="m-0 max-w-[20ch] text-2xl font-bold tracking-tight text-balance text-base-content sm:text-3xl">
        Three ways in, <span className="font-normal text-base-content/45">no required order</span>
      </h2>
      <p className="mt-3 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
        Read a term, review it, quiz yourself. Most people read first, then review and quiz to lock
        it in, but nothing forces an order.
      </p>
      <div className="mt-8">
        <WaysInGrid />
      </div>
    </div>
  );
}
