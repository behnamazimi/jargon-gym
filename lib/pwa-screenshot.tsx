import { BrandIconImage } from "@/lib/brand-icon";
import { PWA_NAME, PWA_THEME_COLOR } from "@/lib/pwa";

export function PwaScreenshot({ layout }: { layout: "wide" | "narrow" }) {
  const isWide = layout === "wide";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: isWide ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: isWide ? 48 : 36,
        background: "#ffffff",
        color: PWA_THEME_COLOR,
      }}
    >
      <BrandIconImage boxSize={isWide ? 160 : 128} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isWide ? "flex-start" : "center",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: isWide ? 72 : 56,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
          }}
        >
          {PWA_NAME}
        </div>
        <div
          style={{
            fontSize: isWide ? 28 : 24,
            color: "#6b7280",
            lineHeight: 1.3,
          }}
        >
          Read, review, and quiz your jargon.
        </div>
      </div>
    </div>
  );
}
