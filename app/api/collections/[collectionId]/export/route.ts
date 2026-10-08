import { NextResponse } from "next/server";
import { readVerifiedUser } from "@/lib/auth/verified-user-header";
import { fetchCollectionForExport, isUuid } from "@/lib/library/details";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** A collection's terms in full, loaded only when the export dialog opens. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  if (!(await readVerifiedUser(request.headers))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }

  const { collectionId } = await params;
  if (!isUuid(collectionId)) {
    return NextResponse.json(
      { error: "Invalid collection id." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const terms = await fetchCollectionForExport(await createClient(), collectionId);
    return NextResponse.json({ terms }, { headers: NO_STORE });
  } catch (error) {
    console.error("Couldn't load the collection for export:", error);
    return NextResponse.json(
      { error: "Couldn't load this collection." },
      { status: 500, headers: NO_STORE },
    );
  }
}
