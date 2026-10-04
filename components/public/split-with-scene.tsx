import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SplitWithSceneProps = {
  children: ReactNode;
  scene: ReactNode;
  /** Put the scene above the text on phones instead of below it. */
  sceneFirstOnPhone?: boolean;
  /** Leave the scene out on phones, where it would push the content down. */
  hideSceneOnPhone?: boolean;
  className?: string;
};

export function SplitWithScene({
  children,
  scene,
  sceneFirstOnPhone = false,
  hideSceneOnPhone = false,
  className,
}: SplitWithSceneProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-20",
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      <div
        className={cn(
          "mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-none",
          sceneFirstOnPhone && "order-first lg:order-none",
          hideSceneOnPhone && "max-sm:hidden",
        )}
      >
        {scene}
      </div>
    </div>
  );
}
