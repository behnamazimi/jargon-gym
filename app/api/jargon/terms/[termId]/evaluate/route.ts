import { NextResponse } from "next/server";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";
import { computeTermEvalHash } from "@/lib/jargon/term-eval/content-hash";
import { evaluateTermEntry } from "@/lib/jargon/term-eval/evaluate";
import type { EvalTerm } from "@/lib/jargon/term-eval/rubric";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTermCardForUser } from "@/lib/trace-queue/hydrate";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const userId = request.headers.get(VERIFIED_USER_HEADER);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

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

  try {
    const result = await evaluateTermEntry(term);
    const { error } = await admin.from("term_evaluations").upsert(
      {
        term_id: termId,
        schema_fit: result.schemaFit,
        plain: result.plain,
        content_hash: computeTermEvalHash(term),
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
