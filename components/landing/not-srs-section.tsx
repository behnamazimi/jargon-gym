import { NoDueDatesScene } from "@/components/illustrations/scenes/no-due-dates";

export function NotSrsSection() {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-20">
      <div>
        <h2 className="m-0 max-w-[14ch] text-balance text-4xl font-medium tracking-tight sm:text-5xl">
          No{" "}
          <span className="line-through decoration-base-content/60 decoration-[3px]">
            due dates
          </span>{" "}
          to fall behind on
        </h2>
        <p className="mt-5 m-0 max-w-[52ch] text-base leading-relaxed text-base-content/85">
          Apps like Anki quiz you on a fixed schedule, so terms come due whether or not you&apos;re
          ready. Miss a day and cards pile up, the guilt kicks in, and the schedule stops matching
          how you actually want to learn. Lobyas has no due dates and no reset button, come back
          whenever, nothing&apos;s overdue.
        </p>
      </div>
      <NoDueDatesScene className="mx-auto max-w-md lg:max-w-none" />
    </div>
  );
}
