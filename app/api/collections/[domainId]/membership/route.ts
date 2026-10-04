import { NextResponse } from "next/server";
import { readVerifiedUser } from "@/lib/auth/verified-user-header";
import { isUuid } from "@/lib/library/details";
import { getCollectionMembership } from "@/lib/library/membership";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** For the CTA on cached public collection pages, asked from the browser once signed in. */
export async function GET(request: Request, { params }: { params: Promise<{ domainId: string }> }) {
  const user = await readVerifiedUser(request.headers);
  if (!user) {
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
    const state = await getCollectionMembership(await createClient(), user.id, domainId);
    return NextResponse.json({ state }, { headers: NO_STORE });
  } catch (error) {
    console.error("Couldn't check the collection membership:", error);
    return NextResponse.json(
      { error: "Couldn't check this collection." },
      { status: 500, headers: NO_STORE },
    );
  }
}
