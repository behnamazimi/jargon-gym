import { OG_CONTENT_TYPE, OG_SIZE, renderSpecimenImage } from "@/lib/seo/og/specimen-image";

export const alt = "Lobyas: learn the terms that stick";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderSpecimenImage({
    kicker: "Lobyas",
    heading: "Stop nodding along to terms you don't actually know.",
    body: "Read, review and quiz the terms of a field or the words of a language, until they stick.",
    accent: true,
  });
}
