import type { ReactNode } from "react";

export function AdminSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id={id} className="m-0 text-base font-semibold text-base-content">
            {title}
          </h2>
          {description ? <p className="m-0 text-sm text-base-content/65">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
