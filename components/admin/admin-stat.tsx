export function AdminStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number | null;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-base-300 px-3 py-3">
      <p className="m-0 text-xl font-semibold tabular-nums text-base-content">{value ?? "—"}</p>
      <p className="m-0 text-xs text-base-content/65">{label}</p>
      {hint ? <p className="m-0 mt-0.5 text-xs text-base-content/50">{hint}</p> : null}
    </div>
  );
}
