import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-semibold text-base-content">{title}</h1>
        <p className="mt-1 text-base text-base-content/65">{description}</p>
      </div>
      {actions}
    </header>
  );
}
