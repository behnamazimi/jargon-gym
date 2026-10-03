import { useId, type ReactNode } from "react";

/** Shows its children only inside the shape `d`, e.g. so a character can sink out of view. */
export function Clip({ d, children }: { d: string; children: ReactNode }) {
  const id = `ill-clip-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <g>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
    </g>
  );
}
