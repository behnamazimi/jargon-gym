type ProgressBarProps = {
  known: number;
  total: number;
};

export function ProgressBar({ known, total }: ProgressBarProps) {
  const pct = total > 0 ? (known / total) * 100 : 0;

  return (
    <div className="mb-4 flex items-center gap-2.5 text-[12.5px] text-muted">
      <span className="shrink-0">
        {known} / {total} known
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
        <div
          className="h-full rounded bg-success transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
