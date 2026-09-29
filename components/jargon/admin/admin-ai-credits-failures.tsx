import type { AiCreditFailureReason } from "@/lib/ai-credits/admin";

/** Why requests were refunded in the last 24 hours, most common first. */
export function AdminAiCreditsFailures({ reasons }: { reasons: AiCreditFailureReason[] }) {
  return (
    <section aria-labelledby="ai-credits-failures" className="flex flex-col gap-3">
      <h2 id="ai-credits-failures" className="m-0 text-base font-semibold text-base-content">
        Why requests failed
      </h2>
      {reasons.length === 0 ? (
        <p className="m-0 text-sm text-base-content/65">
          Nothing failed in the last 24 hours. When a request fails, its credits are refunded and
          the reason shows up here.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {reasons.map((item) => (
            <li
              key={item.reason}
              className="flex flex-col gap-1 rounded-lg border border-base-300 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <p className="m-0 min-w-0 break-words text-sm text-base-content">{item.reason}</p>
              <p className="m-0 shrink-0 text-xs text-base-content/65">
                <span className="tabular-nums">{item.failures}</span>{" "}
                {item.failures === 1 ? "time" : "times"} ·{" "}
                <span className="tabular-nums">{item.people}</span>{" "}
                {item.people === 1 ? "person" : "people"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
