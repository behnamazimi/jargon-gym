const DUTCH = new Set(
  "de het een van en is niet voor met dat die zijn op te aan ook maar als om bij naar uit wordt kan door over er dan nog zo geen worden heeft deze".split(
    " ",
  ),
);
const ENGLISH = new Set(
  "the a an of and is not for with that this are on to in it as be by or from at was has have which can will your you".split(
    " ",
  ),
);

/** A rough guess at the language of some text, used only for a soft hint.
 *  Null when there isn't enough to go on. */
export function guessLanguage(texts: string[]): "en" | "nl" | null {
  let dutch = 0;
  let english = 0;
  let words = 0;
  for (const text of texts) {
    for (const word of text.toLowerCase().match(/[a-zà-ÿ']+/g) ?? []) {
      words++;
      if (DUTCH.has(word)) dutch++;
      if (ENGLISH.has(word)) english++;
    }
  }
  if (words < 8) return null;
  if (dutch >= 3 && dutch > english * 1.5) return "nl";
  if (english >= 3 && english > dutch * 1.5) return "en";
  return null;
}
