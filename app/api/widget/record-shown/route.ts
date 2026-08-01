import { applyTermShown } from "@/lib/jargon/review-outcome";
import { handleWidgetTermAction } from "@/lib/widget/term-action";

export async function POST(request: Request) {
  return handleWidgetTermAction(
    request,
    ({ admin, userId, termId }) => applyTermShown(admin, userId, termId, "admin"),
    "Couldn't record term as shown.",
  );
}
