// Concrete situations to seed each piece, so pieces don't all drift to the
// same topic (often the collection's own name). The model can swap one out
// when the terms don't fit it.
const STORY_SETTINGS = [
  "a busy morning at a bakery",
  "moving into a new apartment",
  "a delayed train and a stranger on the platform",
  "planning a surprise birthday party",
  "a visit to the doctor",
  "a lost cat in the neighbourhood",
  "a job interview that goes off script",
  "a rainy weekend at home",
  "cooking dinner for friends",
  "a local football match",
  "a day trip to the beach",
  "a noisy neighbour",
  "buying a second-hand bike",
  "the first day at a new job",
  "a school trip to a museum",
  "a camping trip in bad weather",
  "a power cut in the evening",
  "the Saturday market",
  "a video call with a grandparent",
  "a small café that is about to close",
  "a team launching a new product",
  "a late-night problem at work",
  "a hotel reception during a storm",
  "a road trip with an old car",
  "a garden that wins a prize",
  "a lost suitcase at the airport",
  "a startup's first customer",
  "a hospital night shift",
  "a library that is getting a makeover",
  "a family moving to another country",
];

export function pickSetting(rng: () => number = Math.random): string {
  return STORY_SETTINGS[Math.floor(rng() * STORY_SETTINGS.length)]!;
}
