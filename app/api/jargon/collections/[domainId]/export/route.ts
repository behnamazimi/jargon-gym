import { NextResponse } from "next/server";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";
import { fetchCollectionForExport, isUuid } from "@/lib/jargon/library/details";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** A collection's terms in full, loaded only when the export dialog opens. */
export async function GET(request: Request, { params }: { params: Promise<{ domainId: string }> }) {
  if (!request.headers.get(VERIFIED_USER_HEADER)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }

  const { domainId } = await params;
  if (!isUuid(domainId)) {
    return NextResponse.json(
      { error: "Invalid collection id." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const terms = await fetchCollectionForExport(await createClient(), domainId);
    return NextResponse.json({ terms }, { headers: NO_STORE });
  } catch (error) {
    console.error("Couldn't load the collection for export:", error);
    return NextResponse.json(
      { error: "Couldn't load this collection." },
      { status: 500, headers: NO_STORE },
    );
  }
}
