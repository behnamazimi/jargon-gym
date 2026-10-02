const SRS_ROWS = ["Runway", "TAM", "Churn"];
const JARGON_GYM_ROWS = ["Burn rate", "ARR", "Vesting"];

function SrsComparison() {
  return (
    <div
      className="grid grid-cols-2 divide-x divide-base-content/15 border-y border-base-content/15"
      aria-hidden
    >
      <div className="py-6 pe-5 sm:pe-8">
        <p className="m-0 text-sm text-base-content/70">Spaced repetition apps</p>
        <p className="font-heading m-0 mt-3 text-6xl font-medium leading-none">47</p>
        <p className="m-0 mt-1 text-sm text-base-content/70">cards overdue</p>
        <ul className="m-0 mt-5 list-none space-y-1.5 p-0 text-base-content/70">
          {SRS_ROWS.map((label) => (
            <li key={label} className="text-sm line-through decoration-base-content/50">
              {label}
            </li>
          ))}
        </ul>
      </div>
      <div className="py-6 ps-5 sm:ps-8">
        <p className="m-0 text-sm font-medium text-primary-text">Jargon Gym</p>
        <p className="font-heading m-0 mt-3 text-6xl font-medium leading-none text-primary-text">
          0
        </p>
        <p className="m-0 mt-1 text-sm text-base-content/70">due dates</p>
        <ul className="m-0 mt-5 list-none space-y-1.5 p-0">
          {JARGON_GYM_ROWS.map((label) => (
            <li key={label} className="text-sm">
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

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
          how you actually want to learn. Jargon Gym has no due dates and no reset button, come back
          whenever, nothing&apos;s overdue.
        </p>
      </div>
      <SrsComparison />
    </div>
  );
}
