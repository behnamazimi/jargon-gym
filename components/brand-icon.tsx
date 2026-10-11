import { LobyaMarkScene } from "@/components/illustrations/scenes/lobya-mark";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-5 rounded-[4px]",
  md: "size-8 rounded",
} as const;

/**
 * The brand lobya on its light tile, sized for the header, the phone bar and
 * the footer. It's drawn too big for the tile, so its bottom is cropped off.
 */
export function BrandIcon({
  className,
  size = "md",
}: {
  className?: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      className={cn(
        "ill-mark-tile relative inline-block shrink-0 overflow-hidden",
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      <LobyaMarkScene className="absolute top-[26%] left-1/2 h-[108%] w-auto -translate-x-1/2" />
    </span>
  );
}
