import type { CSSProperties } from "react";

export const BRAND_ICON = {
  box: 32,
  background: "#3f4755",
  color: "#f8f9fb",
  borderRadius: 4,
  fontSize: 24,
  fontWeight: 900,
  stroke: 0.8,
} as const;

export const BRAND_ICON_BOX_SIZES = {
  sm: 20,
  md: BRAND_ICON.box,
} as const;

export const APPLE_ICON_SIZE = 180;

function scaleBrandIcon(boxSize: number) {
  const scale = boxSize / BRAND_ICON.box;

  return {
    box: boxSize,
    borderRadius: BRAND_ICON.borderRadius * scale,
    fontSize: BRAND_ICON.fontSize * scale,
    stroke: BRAND_ICON.stroke * scale,
  };
}

type BrandIconGlyphsProps = {
  fontSize: number;
  stroke: number;
  strokeColor: string;
};

export function BrandIconGlyphs({ fontSize, stroke, strokeColor }: BrandIconGlyphsProps) {
  return (
    <>
      <span
        style={{
          fontSize: fontSize,
          fontWeight: BRAND_ICON.fontWeight,
          lineHeight: 1,
          // An L is heavy on its left and sits low, so nudge it toward the visual centre.
          transform: `translate(${fontSize * 0.04}px, ${-fontSize * 0.04}px)`,
          WebkitTextStroke: `${stroke}px ${strokeColor}`,
          paintOrder: "stroke fill",
        }}
      >
        L
      </span>
    </>
  );
}

export function brandIconBaseGlyphsProps(strokeColor = "currentColor") {
  return {
    fontSize: BRAND_ICON.fontSize,
    stroke: BRAND_ICON.stroke,
    strokeColor,
  };
}

type BrandIconImageProps = {
  boxSize: number;
  fill?: boolean;
  /** Inset the glyph ~20% so Android adaptive icons keep the L in the safe zone. */
  maskable?: boolean;
};

export function BrandIconImage({ boxSize, fill = false, maskable = false }: BrandIconImageProps) {
  const glyphBox = maskable ? boxSize * 0.8 : boxSize;
  const scaled = scaleBrandIcon(glyphBox);

  return (
    <div
      style={{
        width: fill ? "100%" : boxSize,
        height: fill ? "100%" : boxSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_ICON.background,
        color: BRAND_ICON.color,
        borderRadius: maskable ? 0 : scaled.borderRadius,
      }}
    >
      <BrandIconGlyphs
        fontSize={scaled.fontSize}
        stroke={scaled.stroke}
        strokeColor={BRAND_ICON.color}
      />
    </div>
  );
}

export function brandIconShellStyle(boxSize: number): CSSProperties {
  return {
    width: boxSize,
    height: boxSize,
  };
}

export function brandIconScaleStyle(boxSize: number): CSSProperties {
  return {
    transform: `scale(${boxSize / BRAND_ICON.box})`,
    transformOrigin: "center center",
  };
}
