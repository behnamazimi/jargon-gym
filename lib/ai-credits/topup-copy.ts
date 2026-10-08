import { build, type RequestEmail } from "@/lib/requests/email-copy";
import { pluralize } from "@/lib/utils";

export const TOPUP_COPY = {
  button: "Get free credits",
  buttonFor: (credits: number) => `Get ${credits} free credits`,
  working: "Adding credits…",
  failed: "Couldn't add credits. Try again.",
  unavailable: "Free credits aren't available right now.",
  notNeeded: "You still have credits. You can get free credits when you're nearly out.",
  whenNearlyOut: "You can get free credits when you're nearly out.",
  alreadyToday: "You've already claimed today's free credits. You can claim more tomorrow.",
  eligible: (credits: number) => `You're eligible for ${credits} free credits.`,
  added: (credits: number) => `Added ${pluralize(credits, "free credit")}.`,
} as const;

export function buildTopUpUserEmail(input: {
  added: number;
  remaining: number;
  settingsUrl: string;
}): RequestEmail {
  return build("Your AI credits were topped up", {
    heading: "More AI credits are ready",
    paragraphs: [
      `We added ${pluralize(input.added, "credit")} to your account. You now have ${pluralize(input.remaining, "credit")} for AI quizzes and Stories.`,
    ],
    button: { label: "See your credits", url: input.settingsUrl },
  });
}

/** For the people who run the app, not for the person who topped up. */
export function buildTopUpAdminEmail(input: {
  email: string;
  added: number;
  remaining: number;
  adminUrl: string;
}): RequestEmail {
  return build("AI credits topped up", {
    heading: "Someone topped up their AI credits",
    paragraphs: [
      `${input.email} added ${pluralize(input.added, "credit")} and now has ${pluralize(input.remaining, "credit")}.`,
    ],
    button: { label: "Open their account", url: input.adminUrl },
  });
}
