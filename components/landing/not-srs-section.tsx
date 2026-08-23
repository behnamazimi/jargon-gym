import { Check, X } from "lucide-react";

const SRS_ROWS = ["Runway", "TAM", "Churn"];
const JARGON_GYM_ROWS = ["Burn rate", "ARR", "Vesting"];

function SrsComparison() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden>
      <div className="rounded-xl border border-base-300 bg-base-200/40 p-4">
        <p className="m-0 text-xs font-semibold tracking-wide text-base-content/50">Typical SRS</p>
        <p className="font-heading m-0 mt-2 text-2xl font-bold text-error">47</p>
        <p className="m-0 text-xs text-base-content/50">cards overdue</p>
        <div className="mt-3 space-y-1.5">
          {SRS_ROWS.map((label) => (
            <div key={label} className="flex items-center gap-1.5 text-base-content/40">
              <X className="size-3.5 shrink-0 text-error/60" strokeWidth={2} />
              <span className="truncate text-xs line-through decoration-base-content/30">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
        <p className="m-0 text-xs font-semibold tracking-wide text-primary">Jargon Gym</p>
        <p className="font-heading m-0 mt-2 text-2xl font-bold text-primary">0</p>
        <p className="m-0 text-xs text-base-content/50">due dates</p>
        <div className="mt-3 space-y-1.5">
          {JARGON_GYM_ROWS.map((label) => (
            <div key={label} className="flex items-center gap-1.5 text-base-content">
              <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2} />
              <span className="truncate text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotSrsSection() {
  return (
    <div className="grid max-w-4xl grid-cols-1 items-center gap-8 sm:grid-cols-[1.2fr_1fr] sm:gap-10">
      <div>
        <h2 className="m-0 max-w-[14ch] text-4xl font-bold tracking-tight text-balance text-base-content sm:text-5xl">
          This isn&apos;t{" "}
          <span className="relative inline-block">
            spaced repetition
            <span
              aria-hidden
              className="absolute inset-x-0 top-[55%] h-[3px] -translate-y-1/2 -rotate-1 rounded-full bg-error/70"
            />
          </span>
        </h2>
        <p className="mt-3 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
          Anki and other SRS tools schedule what you see by date. Cards pile up, the daily guilt
          kicks in, and the schedule stops matching how you actually want to learn. Jargon Gym has
          no due dates and no reset button, come back whenever, nothing&apos;s overdue.
        </p>
      </div>
      <SrsComparison />
    </div>
  );
}
