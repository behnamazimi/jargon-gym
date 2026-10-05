import { OG_CONTENT_TYPE, OG_SIZE, renderSpecimenImage } from "@/lib/seo/og/specimen-image";

export const alt = "Lobyas features";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderSpecimenImage({
    kicker: "Features",
    heading: "Stories you can listen to and repeat out loud.",
    body: "Voices, stories, shadowing and no due dates, for the terms of a field or the words of a language.",
    accent: true,
  });
}
