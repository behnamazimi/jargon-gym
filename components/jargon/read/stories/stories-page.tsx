"use client";

import { AlertCircle, BookOpenText, Loader2 } from "lucide-react";
import type { StoriesSetupData } from "@/lib/stories/setup";
import { JargonErrorAlert } from "@/components/jargon/shared/error-alert";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
} from "@/components/jargon/quiz/quiz-ui";
import { StoryReader } from "@/components/jargon/read/stories/story-reader";
import { StorySetupPanel } from "@/components/jargon/read/stories/story-setup-panel";
import {
  useStorySession,
  type StorySession,
} from "@/components/jargon/read/stories/use-story-session";
import { StudyNoActiveCollectionsState } from "@/components/jargon/study/study-setup-panel";
import { Button, LinkButton } from "@/components/ui/button";
import { STORY_MIN_TERMS } from "@/lib/stories/types";

function StoriesNoTerms() {
  return (
    <QuizPanelBody>
      <QuizCenteredState
        icon={BookOpenText}
        title="Not enough terms to read"
        description={`Stories need a collection with at least ${STORY_MIN_TERMS} terms you haven't marked known.`}
      >
        <LinkButton href="/jargon" variant="outline" className="min-h-11">
          Collections
        </LinkButton>
      </QuizCenteredState>
    </QuizPanelBody>
  );
}

function StoriesGeneratingStep() {
  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <QuizPanelBody className="flex min-h-0 flex-1 items-center justify-center">
        <QuizCenteredState
          icon={Loader2}
          iconClassName="animate-spin"
          title="Writing your story"
          description="Weaving your next terms into a short piece… This usually takes a few seconds."
        />
      </QuizPanelBody>
    </QuizPanel>
  );
}

function StoriesErrorStep({ session }: { session: StorySession }) {
  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <QuizPanelHeader
        icon={AlertCircle}
        title="Story didn't come through"
        description="Nothing was saved to your progress."
      />
      <QuizPanelBody className="space-y-4">
        <JargonErrorAlert error={session.errorMessage ?? "Couldn't write a story. Try again."} />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            onPress={() => void session.generate()}
            className="min-h-11"
          >
            Try again
          </Button>
          <Button type="button" variant="ghost" onPress={session.backToSetup} className="min-h-11">
            Back to setup
          </Button>
        </div>
      </QuizPanelBody>
    </QuizPanel>
  );
}

export function StoriesPage({ setup }: { setup: StoriesSetupData }) {
  const session = useStorySession(setup);

  switch (session.step) {
    case "generating":
      return <StoriesGeneratingStep />;
    case "error":
      return <StoriesErrorStep session={session} />;
    case "reading":
      return session.story ? (
        <StoryReader
          session={session}
          story={session.story}
          terms={session.terms}
          narrationAccess={setup.narrationAccess}
        />
      ) : null;
    default:
      return (
        <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
          {setup.collections.length === 0 ? (
            <StudyNoActiveCollectionsState description="Turn on a collection on the collection page before you read stories." />
          ) : setup.initialDomainId === null ? (
            <StoriesNoTerms />
          ) : (
            <StorySetupPanel
              session={session}
              collections={setup.collections}
              llmConfigured={setup.llmConfigured}
              providerLabel={setup.providerLabel}
            />
          )}
        </QuizPanel>
      );
  }
}
