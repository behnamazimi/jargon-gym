import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SketchDefs, type SketchIds } from "./sketch-defs";

type IllustrationProps = {
  /** Describe the scene only when it adds meaning; otherwise it's hidden from screen readers. */
  title?: string;
  viewBox?: string;
  className?: string;
  children: ReactNode;
};

export function Illustration({
  title,
  viewBox = "0 0 800 600",
  className,
  children,
}: IllustrationProps) {
  const prefix = `ill-${useId().replace(/[^\w-]/g, "")}`;
  const ids: SketchIds = {
    wobble: `${prefix}-wobble`,
    hatch: `${prefix}-hatch`,
    crosshatch: `${prefix}-crosshatch`,
  };
  // Shapes pick up their hatch patterns through these, so they never need the ids.
  const style = {
    "--ill-hatch-fill": `url(#${ids.hatch})`,
    "--ill-crosshatch-fill": `url(#${ids.crosshatch})`,
  } as CSSProperties;

  return (
    <svg
      viewBox={viewBox}
      className={cn("block h-auto w-full", className)}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <SketchDefs ids={ids} viewBox={viewBox} />
      <g filter={`url(#${ids.wobble})`} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}
