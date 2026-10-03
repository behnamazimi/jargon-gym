const AI_FEATURES: { label: string; body: string }[] = [
  {
    label: "Stories",
    body: "A short story built around the terms you're due to read, at the language level you pick, A1 to C2.",
  },
  {
    label: "AI quizzes",
    body: "Questions written from your own terms and examples. A simple quiz works with no AI at all.",
  },
  {
    label: "Listen",
    body: "Hear terms and stories read aloud. Stories highlight each sentence as it's spoken.",
  },
];

export function AiSection() {
  return (
    <div className="max-w-3xl">
      <h2 className="m-0 max-w-[22ch] text-balance text-3xl font-medium tracking-tight sm:text-4xl">
        AI that works from{" "}
        <span className="underline decoration-primary decoration-[3px] underline-offset-[0.18em]">
          your terms
        </span>
      </h2>
      <p className="mt-4 m-0 max-w-[52ch] text-base leading-relaxed text-base-content/85">
        Use it for the terms of a field or the vocabulary of a language. New accounts get some free
        AI credits, or you can add your own Google or Anthropic API key. Read, Review, and simple
        quizzes never cost credits.
      </p>
      <dl className="m-0 mt-8 divide-y divide-base-content/15 border-y border-base-content/15">
        {AI_FEATURES.map(({ label, body }) => (
          <div
            key={label}
            className="grid grid-cols-1 gap-1 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8"
          >
            <dt className="font-heading text-xl font-medium">{label}</dt>
            <dd className="m-0 text-base leading-relaxed text-base-content/80">{body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
