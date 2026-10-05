import { NextResponse } from "next/server";
import { readVerifiedUser } from "@/lib/auth/verified-user-header";
import { getFeatureSettings } from "@/lib/ai/feature-settings";
import { withRunGuard } from "@/lib/ai/run-guard";
import { countRecentGenerations, recordUsage } from "@/lib/ai/usage";
import { getReadyAudio, getOrCreateAudio } from "@/lib/ai/speech/audio";
import { serveAudio } from "@/lib/ai/speech/serve";
import { loadTermSubject } from "@/lib/ai/speech/subjects";
import { getNarrationAccessForUser, isAdminAccount } from "@/lib/narration/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/** A request that loses the claim waits this long for the winner's clip. */
const WAIT_FOR_OTHER_MS = 30_000;

type RouteContext = { params: Promise<{ termId: string }> };

async function userCanReadTerm(termId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("terms")
    .select("id")
    .eq("id", termId)
    .not("definition", "is", null)
    .maybeSingle();
  return data != null;
}

/** Trusts the proxy (lib/supabase/proxy.ts) to have verified the session and
 *  forwarded the user id. Still checks narration access and that the user can
 *  read the term, since the admin client below bypasses RLS. */
async function authorize(
  request: Request,
  termId: string,
): Promise<{ denied: NextResponse } | { userId: string }> {
  const userId = (await readVerifiedUser(request.headers))?.id;
  if (!userId) return { denied: new NextResponse(null, { status: 401 }) };

  const admin = createAdminClient();
  // Admins may listen from the admin pages; only people with access can have a clip made.
  const allowed =
    (await getNarrationAccessForUser(admin, userId)) ||
    (request.method === "GET" && (await isAdminAccount(admin, userId)));
  if (!allowed) return { denied: new NextResponse(null, { status: 403 }) };

  if (!(await userCanReadTerm(termId))) return { denied: new NextResponse(null, { status: 404 }) };
  return { userId };
}

/** Serves cached audio only. It never generates, so preloading a card costs
 *  nothing; generation is an explicit POST. */
export async function GET(request: Request, { params }: RouteContext) {
  const { termId } = await params;
  const auth = await authorize(request, termId);
  if ("denied" in auth) return auth.denied;

  const admin = createAdminClient();
  const subject = await loadTermSubject(admin, termId);
  if (!subject) return new NextResponse(null, { status: 404 });
  return serveAudio(request, admin, subject);
}

/** True when this person has used up the term narration cap. A clip that is
 *  already cached never counts against it. */
async function overDailyCap(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const settings = await getFeatureSettings(admin, "narration_term");
  if (settings?.dailyCap == null) return false;
  return (await countRecentGenerations(admin, userId, "narration_term")) >= settings.dailyCap;
}

/** Explicit "prepare": generates the clip if it is not cached yet. Replies
 *  with JSON only; the audio itself is then fetched with GET. Only a request
 *  that actually calls the speech provider is counted, failures included. */
export async function POST(request: Request, { params }: RouteContext) {
  const { termId } = await params;
  const auth = await authorize(request, termId);
  if ("denied" in auth) return auth.denied;

  const admin = createAdminClient();
  const { userId } = auth;

  const subject = await loadTermSubject(admin, termId);
  if (!subject) return new NextResponse(null, { status: 404 });

  if (await getReadyAudio(admin, subject)) return NextResponse.json({ ready: true });

  // One generation per person at a time, so the cap is checked against
  // everything they have already made before the next one starts.
  const guarded = await withRunGuard({ admin, userId, feature: "narration_term" }, async () => {
    if (await overDailyCap(admin, userId)) return "capped" as const;

    const result = await getOrCreateAudio(admin, subject, { waitMs: WAIT_FOR_OTHER_MS });
    if ("generation" in result && result.generation) {
      for (const call of result.generation.calls) {
        await recordUsage(admin, { userId, feature: "narration_term", ...call });
      }
    }
    return result;
  });

  if (guarded.busy) {
    return NextResponse.json({ ready: false, busy: true }, { status: 429 });
  }
  const result = guarded.value;
  if (result === "capped") {
    return NextResponse.json({ ready: false, capped: true }, { status: 429 });
  }
  if (result.status !== "ready") return NextResponse.json({ ready: false }, { status: 502 });
  return NextResponse.json({ ready: true });
}
