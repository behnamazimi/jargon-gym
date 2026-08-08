import { applyTermSeen } from "@/lib/jargon/review-outcome";
import { handleWidgetTermAction } from "@/lib/widget/term-action";

export async function POST(request: Request) {
  return handleWidgetTermAction(
    request,
    ({ admin, userId, termId }) => applyTermSeen(admin, userId, termId, "admin"),
    "Couldn't record term as shown.",
  );
}
