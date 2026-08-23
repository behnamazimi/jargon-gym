import { getSessionUser } from "@/lib/auth/require-session";
import {
  getNextBestActionHints,
  type NextBestActionHint,
} from "@/lib/smart-queue/next-best-action";

export async function loadStudyHints(): Promise<NextBestActionHint[]> {
  const { supabase, user } = await getSessionUser();
  if (!user) return [];
  return getNextBestActionHints(supabase, user.id);
}
