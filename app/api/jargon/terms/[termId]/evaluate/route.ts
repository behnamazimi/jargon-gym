import { NextResponse } from "next/server";
import { getUserIsAdmin } from "@/lib/auth/require-session";
import { readVerifiedUser } from "@/lib/auth/verified-user-header";
import { computeTermEvalHash } from "@/lib/jargon/term-eval/content-hash";
import { evaluateTermEntry } from "@/lib/jargon/term-eval/evaluate";
import type { EvalTerm } from "@/lib/jargon/term-eval/rubric";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTermCardForUser } from "@/lib/trace-queue/hydrate";

export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const userId = (await readVerifiedUser(request.headers))?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!(await getUserIsAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { termId } = await params;
  if (!UUID_RE.test(termId)) {
    return NextResponse.json({ error: "Invalid term id." }, { status: 400 });
  }

  const admin = createAdminClient();
  const card = await fetchTermCardForUser(admin, userId, termId);
  if (!card) return NextResponse.json({ error: "Term not found." }, { status: 404 });

  const term: EvalTerm = {
    domainName: card.domainName,
    term: card.term,
    category: card.category,
    definition: card.definition,
    example: card.example,
    mentalModel: card.mentalModel,
    discussion: card.discussion,
    antiExample: card.antiExample,
    controversy: card.controversy,
  };

  const contentHash = computeTermEvalHash(term);
  const { data: stored } = await admin
    .from("term_evaluations")
    .select("schema_fit, plain, content_hash")
    .eq("term_id", termId)
    .maybeSingle();
  if (stored && stored.content_hash === contentHash) {
    return NextResponse.json({ schemaFit: stored.schema_fit, plain: stored.plain });
  }

  try {
    const result = await evaluateTermEntry(term);
    const { error } = await admin.from("term_evaluations").upsert(
      {
        term_id: termId,
        schema_fit: result.schemaFit,
        plain: result.plain,
        content_hash: contentHash,
        evaluated_by: userId,
      },
      { onConflict: "term_id" },
    );
    if (error) {
      console.error("term evaluation save failed", error.message);
      return NextResponse.json({ error: "Evaluation failed." }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("term evaluation failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Evaluation failed." }, { status: 502 });
  }
}
