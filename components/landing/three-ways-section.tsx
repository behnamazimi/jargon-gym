import { BookOpen, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const WAYS: { icon: LucideIcon; label: string; body: string }[] = [
  {
    icon: Zap,
    label: "Read",
    body: "See a term with real usage, not just a definition. Or read an AI story built around your terms.",
  },
  {
    icon: BookOpen,
    label: "Review",
    body: "Confirm what you know. Terms you're shaky on come up first.",
  },
  {
    icon: Sparkles,
    label: "Quiz",
    body: "A real check, sharper with AI questions.",
  },
];

function WaysList() {
  return (
    <ul className="m-0 list-none divide-y divide-base-content/10 border-y border-base-content/10 p-0">
      {WAYS.map(({ icon: Icon, label, body }) => (
        <li
          key={label}
          className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-x-6"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-base-content">
            <Icon aria-hidden className="size-5 text-primary" strokeWidth={1.75} />
            {label}
          </span>
          <span className="col-span-2 text-sm leading-relaxed text-base-content/75 sm:col-span-1">
            {body}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ThreeWaysSection() {
  return (
    <div>
      <h2 className="m-0 max-w-[20ch] text-2xl font-bold tracking-tight text-balance text-base-content sm:text-3xl">
        Three ways to learn a term,{" "}
        <span className="font-normal text-base-content/45">no required order</span>
      </h2>
      <p className="mt-3 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
        Read a term, review it, quiz yourself. Most people read first, then review and quiz to lock
        it in, but nothing forces an order.
      </p>
      <div className="mt-8">
        <WaysList />
      </div>
    </div>
  );
}
