// Concrete situations to seed each piece, so pieces don't all drift to the
// same topic (often the collection's own name). The model can swap one out
// when the terms don't fit it.
const EVERYDAY_SETTINGS = [
  "a busy morning at a bakery",
  "moving into a new apartment",
  "a delayed train and a stranger on the platform",
  "planning a surprise birthday party",
  "a visit to the doctor",
  "a lost cat in the neighbourhood",
  "a rainy weekend at home",
  "cooking dinner for friends",
  "a local football match",
  "a day trip to the beach",
  "a noisy neighbour",
  "buying a second-hand bike",
  "a school trip to a museum",
  "a camping trip in bad weather",
  "a power cut in the evening",
  "the Saturday market",
  "a video call with a grandparent",
  "a road trip with an old car",
  "a lost suitcase at the airport",
  "a family moving to another country",
];

const WORK_SETTINGS = [
  "the first day at a new job",
  "a job interview that goes off script",
  "a small café that is about to close",
  "a team launching a new product",
  "a late-night problem at work",
  "a hotel reception during a storm",
  "a startup's first customer",
  "a hospital night shift",
  "a library that is getting a makeover",
  "a database migration on a Friday afternoon",
  "a new teammate's first code review",
  "an outage during a big sale",
  "choosing a vendor for a new tool",
  "an angry customer escalation",
  "a phishing email that fools someone",
  "a hackathon weekend",
  "quarterly planning with too many priorities",
  "moving an old system to the cloud",
  "a flaky test that blocks a release",
  "being on call during a holiday",
  "a client demo that goes wrong",
  "hiring for a new role",
  "a budget cut that forces hard choices",
];

// Formats that are about work read oddly around a lost cat.
const WORK_FORMATS = new Set(["slack-thread", "incident-postmortem", "email", "meeting-notes"]);

export function pickSetting(formatId: string, rng: () => number = Math.random): string {
  const pool = WORK_FORMATS.has(formatId)
    ? WORK_SETTINGS
    : [...EVERYDAY_SETTINGS, ...WORK_SETTINGS];
  return pool[Math.floor(rng() * pool.length)]!;
}
