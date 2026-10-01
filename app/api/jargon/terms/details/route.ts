import { NextResponse, type NextRequest } from "next/server";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";
import { fetchTermDetails, parseDetailIds } from "@/lib/jargon/library/details";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Full term details for the Library, fetched in batches as rows scroll into
 *  view and when a card opens. A GET, so it runs in parallel with other
 *  requests instead of queueing like a Server Action. */
export async function GET(request: NextRequest) {
  if (!request.headers.get(VERIFIED_USER_HEADER)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }

  const ids = parseDetailIds(request.nextUrl.searchParams.get("ids"));
  if (!ids) {
    return NextResponse.json({ error: "Invalid term ids." }, { status: 400, headers: NO_STORE });
  }

  try {
    const terms = await fetchTermDetails(await createClient(), ids);
    return NextResponse.json({ terms }, { headers: NO_STORE });
  } catch (error) {
    console.error("Couldn't load term details:", error);
    return NextResponse.json(
      { error: "Couldn't load these terms." },
      { status: 500, headers: NO_STORE },
    );
  }
}
