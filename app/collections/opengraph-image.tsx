import { OG_CONTENT_TYPE, OG_SIZE, renderSpecimenImage } from "@/lib/seo/og/specimen-image";

export const alt = "Lobyas built-in collections";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderSpecimenImage({
    kicker: "Built-in collections",
    heading: "Pick a field or a language. Learn its words.",
    body: "Real terms from fields and languages, explained in plain language.",
    accent: true,
  });
}
