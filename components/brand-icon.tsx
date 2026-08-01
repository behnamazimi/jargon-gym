import {
  BRAND_ICON_BOX_SIZES,
  BrandIconGlyphs,
  brandIconBaseGlyphsProps,
  brandIconScaleStyle,
  brandIconShellStyle,
} from "@/lib/brand-icon";
import { cn } from "@/lib/utils";

type BrandIconProps = {
  className?: string;
  size?: keyof typeof BRAND_ICON_BOX_SIZES;
};

export function BrandIcon({ className, size = "md" }: BrandIconProps) {
  const boxSize = BRAND_ICON_BOX_SIZES[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded bg-primary/15 text-primary",
        className,
      )}
      style={brandIconShellStyle(boxSize)}
      aria-hidden
    >
      <span
        className="inline-flex items-center justify-center"
        style={brandIconScaleStyle(boxSize)}
      >
        <BrandIconGlyphs {...brandIconBaseGlyphsProps()} />
      </span>
    </span>
  );
}
