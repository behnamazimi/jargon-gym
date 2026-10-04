import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BrandIconImage } from "@/lib/brand-icon";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// The paper, ink and green of the light theme, as hex for the image renderer.
const PAPER = "#fcfaf6";
const INK = "#3a3129";
const MUTED = "#6e655c";
const GREEN = "#2e7a50";

const MAX_BODY = 170;

async function loadFonts() {
  const dir = join(process.cwd(), "assets/fonts");
  const [fraunces, figtree, figtreeMedium] = await Promise.all([
    readFile(join(dir, "fraunces-latin-500-normal.woff")),
    readFile(join(dir, "figtree-latin-400-normal.woff")),
    readFile(join(dir, "figtree-latin-500-normal.woff")),
  ]);
  return [
    { name: "Fraunces", data: fraunces, weight: 500 as const, style: "normal" as const },
    { name: "Figtree", data: figtree, weight: 400 as const, style: "normal" as const },
    { name: "Figtree", data: figtreeMedium, weight: 500 as const, style: "normal" as const },
  ];
}

function headingSize(text: string) {
  if (text.length <= 16) return 112;
  if (text.length <= 28) return 88;
  if (text.length <= 48) return 68;
  return 56;
}

function clip(text: string) {
  return text.length <= MAX_BODY ? text : `${text.slice(0, MAX_BODY - 1).trimEnd()}…`;
}

type SpecimenImage = {
  /** Small line above the heading, e.g. "Standup · Field terms". */
  kicker: string;
  heading: string;
  body?: string;
  /** Next to the logo at the bottom; defaults to the tagline. */
  footer?: string;
  /** Colour the heading green, for brand lines rather than terms. */
  accent?: boolean;
};

/** The share image for public pages: one term or line set large, the way the collections index shows them. */
export async function renderSpecimenImage({
  kicker,
  heading,
  body,
  footer,
  accent,
}: SpecimenImage) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: PAPER,
        color: INK,
        padding: "72px 80px 64px",
        fontFamily: "Figtree",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 30, color: MUTED }}>{kicker}</div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontFamily: "Fraunces",
            fontWeight: 500,
            fontSize: headingSize(heading),
            lineHeight: 1.04,
            letterSpacing: -2,
            color: accent ? GREEN : INK,
          }}
        >
          {heading}
        </div>
        {body ? (
          <div
            style={{ display: "flex", marginTop: 28, fontSize: 36, lineHeight: 1.4, maxWidth: 980 }}
          >
            {clip(body)}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          borderTop: `4px solid ${INK}`,
          paddingTop: 28,
        }}
      >
        <BrandIconImage boxSize={48} />
        <div style={{ display: "flex", fontSize: 30, fontWeight: 500 }}>Lobyas</div>
        <div style={{ display: "flex", fontSize: 30, color: MUTED }}>
          {footer ?? "Learn the terms that stick"}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
