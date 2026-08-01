import { applyKnownToggle } from "@/lib/jargon/review-outcome";
import { handleWidgetTermAction } from "@/lib/widget/term-action";

export async function POST(request: Request) {
  return handleWidgetTermAction(
    request,
    ({ admin, userId, termId }) => applyKnownToggle(admin, userId, termId, true, "admin"),
    "Couldn't mark that term as known.",
  );
}
