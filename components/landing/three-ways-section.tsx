const WAYS: { label: string; body: string }[] = [
  {
    label: "Read",
    body: "See a term with real usage, not just a definition. Or read an AI story built around your terms.",
  },
  {
    label: "Review",
    body: "Confirm what you know. Terms you're shaky on come up first.",
  },
  {
    label: "Quiz",
    body: "A real check, sharper with AI questions.",
  },
];

export function ThreeWaysSection() {
  return (
    <div>
      <h2 className="m-0 max-w-[20ch] text-balance text-3xl font-medium tracking-tight sm:text-4xl">
        Three ways to learn a term, no required order
      </h2>
      <p className="mt-4 m-0 max-w-[52ch] text-base leading-relaxed text-base-content/85">
        Read a term, review it, quiz yourself. Most people read first, then review and quiz to lock
        it in, but nothing forces an order.
      </p>
      <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-x-10 gap-y-8 p-0 sm:grid-cols-3">
        {WAYS.map(({ label, body }) => (
          <li key={label} className="border-t-2 border-base-content/80 pt-4">
            <p className="font-heading m-0 text-3xl font-medium tracking-tight">{label}</p>
            <p className="m-0 mt-2 text-base leading-relaxed text-base-content/80">{body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
