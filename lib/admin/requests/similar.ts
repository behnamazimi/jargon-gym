const MIN_WORD = 4;
const MAX_WORDS = 4;

export function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Two topics are worth merging when they match or one contains the other. */
export function topicsSimilar(a: string, b: string): boolean {
  const left = normalizeTopic(a);
  const right = normalizeTopic(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const [short, long] = left.length <= right.length ? [left, right] : [right, left];
  return short.length >= MIN_WORD && long.includes(short);
}

/** The words of a topic that are long enough to search collection names for. */
export function significantWords(topic: string): string[] {
  const words = normalizeTopic(topic)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= MIN_WORD);
  return [...new Set(words)].slice(0, MAX_WORDS);
}
