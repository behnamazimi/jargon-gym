import { Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export function QuizFab() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end px-5 pb-5">
      <LinkButton href="/jargon/quiz" className="pointer-events-auto shadow-lg">
        <Sparkles className="size-3.5" />
        Quiz me
      </LinkButton>
    </div>
  );
}
