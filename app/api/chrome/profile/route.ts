import { NextResponse } from "next/server";
import { getUserIsAdmin } from "@/lib/auth/require-session";
import { readVerifiedUser } from "@/lib/auth/verified-user-header";
import { aiCreditsMenuMode } from "@/lib/llm/central";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** What the account menu needs on cached public pages, which are rendered
 *  without a session and ask for it from the browser once signed in. */
export async function GET(request: Request) {
  const user = await readVerifiedUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }

  try {
    const isAdmin = await getUserIsAdmin(user.id);
    return NextResponse.json(
      { email: user.email ?? "Account", isAdmin, aiCreditsMode: aiCreditsMenuMode() },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Couldn't load the account menu:", error);
    return NextResponse.json(
      { error: "Couldn't load the account menu." },
      { status: 500, headers: NO_STORE },
    );
  }
}
