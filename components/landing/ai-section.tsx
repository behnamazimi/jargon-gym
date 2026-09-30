import { Headphones, ListChecks, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const AI_FEATURES: { icon: LucideIcon; label: string; body: string }[] = [
  {
    icon: ScrollText,
    label: "Stories",
    body: "A short story built around the terms you're due to read, at the language level you pick, A1 to C2.",
  },
  {
    icon: ListChecks,
    label: "AI quizzes",
    body: "Questions written from your own terms and examples. A simple quiz works with no AI at all.",
  },
  {
    icon: Headphones,
    label: "Listen",
    body: "Hear terms and stories read aloud. Stories highlight each sentence as it's spoken.",
  },
];

export function AiSection() {
  return (
    <div>
      <h2 className="m-0 max-w-[22ch] text-2xl font-bold tracking-tight text-balance text-base-content sm:text-3xl">
        AI that works from{" "}
        <span className="underline decoration-primary decoration-2 underline-offset-4">
          your terms
        </span>
      </h2>
      <p className="mt-3 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
        Use it for a field&apos;s jargon or a language&apos;s vocabulary. New accounts get some free
        AI credits, or you can add your own Google or Anthropic API key. Read, Review, and simple
        quizzes never cost credits.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {AI_FEATURES.map(({ icon: Icon, label, body }) => (
          <div
            key={label}
            className="rounded-2xl bg-base-100 p-5 shadow-surface ring-1 ring-base-content/5"
          >
            <Icon aria-hidden className="size-5 text-primary" strokeWidth={1.75} />
            <p className="m-0 mt-3 text-sm font-semibold text-base-content">{label}</p>
            <p className="m-0 mt-1 text-sm leading-relaxed text-base-content/75">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
