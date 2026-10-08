/** The text spoken for a story: its title as a sentence, then the body. The
 *  narration charge is priced from this text's length, so the price shown
 *  before listening and the price charged use this one function. */
export function buildStoryScript(story: {
  title: string;
  segments: readonly { text: string }[];
}): string {
  const storyTitle = story.title.trim();
  const title = /[.!?…]$/.test(storyTitle) ? storyTitle : `${storyTitle}.`;
  return `${title}\n\n${story.segments.map((segment) => segment.text).join("")}`;
}
