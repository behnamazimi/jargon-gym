import type { CSSProperties } from "react";

export const BRAND_ICON = {
  box: 32,
  background: "#3f4755",
  color: "#f8f9fb",
  letterSpacing: "-0.04em",
  borderRadius: 4,
  jFontSize: 18,
  jFontWeight: 900,
  jStroke: 0.8,
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
    jFontSize: BRAND_ICON.jFontSize * scale,
    jStroke: BRAND_ICON.jStroke * scale,
  };
}

type BrandIconGlyphsProps = {
  jFontSize: number;
  jStroke: number;
  strokeColor: string;
};

export function BrandIconGlyphs({ jFontSize, jStroke, strokeColor }: BrandIconGlyphsProps) {
  return (
    <>
      <span
        style={{
          fontSize: jFontSize,
          fontWeight: BRAND_ICON.jFontWeight,
          lineHeight: 1,
          WebkitTextStroke: `${jStroke}px ${strokeColor}`,
          paintOrder: "stroke fill",
        }}
      >
        JG
      </span>
    </>
  );
}

export function brandIconBaseGlyphsProps(strokeColor = "currentColor") {
  return {
    jFontSize: BRAND_ICON.jFontSize,
    jStroke: BRAND_ICON.jStroke,
    strokeColor,
  };
}

type BrandIconImageProps = {
  boxSize: number;
  fill?: boolean;
  /** Inset the glyph ~20% so Android adaptive icons keep JG in the safe zone. */
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
        letterSpacing: BRAND_ICON.letterSpacing,
        borderRadius: maskable ? 0 : scaled.borderRadius,
      }}
    >
      <BrandIconGlyphs
        jFontSize={scaled.jFontSize}
        jStroke={scaled.jStroke}
        strokeColor={BRAND_ICON.color}
      />
    </div>
  );
}

export function brandIconShellStyle(boxSize: number): CSSProperties {
  return {
    width: boxSize,
    height: boxSize,
    letterSpacing: BRAND_ICON.letterSpacing,
  };
}

export function brandIconScaleStyle(boxSize: number): CSSProperties {
  return {
    transform: `scale(${boxSize / BRAND_ICON.box})`,
    transformOrigin: "center center",
  };
}
