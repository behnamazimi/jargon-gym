import type { ReactNode } from "react";

/** A labelled setting with its control on the right and any status lines below the text. */
export function AdminSettingRow({
  title,
  description,
  notes,
  control,
}: {
  title: string;
  description?: string;
  notes?: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-4 py-3">
      <div className="min-w-0">
        <p className="m-0 font-medium text-base-content">{title}</p>
        {description ? <p className="m-0 text-sm text-base-content/65">{description}</p> : null}
        {notes}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
