"use client";

import { AlertCircle } from "lucide-react";
import { EmptyBoxScene } from "@/components/illustrations/scenes/empty-box";
import { PreparingScene } from "@/components/illustrations/scenes/preparing";
import type { StoriesSetupData } from "@/lib/stories/setup";
import { CreditsInsteadButton } from "@/components/settings/credits-instead-button";
import { JargonErrorAlert } from "@/components/shared/error-alert";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
} from "@/components/quiz/quiz-ui";
import { StoryReader } from "@/components/read/stories/story-reader";
import { StorySetupPanel } from "@/components/read/stories/story-setup-panel";
import { useStorySession, type StorySession } from "@/components/read/stories/use-story-session";
import { StudyNoActiveCollectionsState } from "@/components/read/study/study-paused-state";
import { Button, LinkButton } from "@/components/ui/button";
import type { AiAccessView } from "@/lib/llm/types";
import { STORY_MIN_TERMS } from "@/lib/stories/types";

const CARDS_HREF = "/app/read?view=cards";

function StoriesNoTerms() {
  return (
    <QuizPanelBody>
      <QuizCenteredState
        illustration={<EmptyBoxScene className="w-44" />}
        title="Not enough terms to read"
        description={`Stories need a collection with at least ${STORY_MIN_TERMS} terms you haven't marked known.`}
      >
        <div className="flex flex-wrap justify-center gap-2">
          <LinkButton href="/app/library" variant="outline" className="min-h-11">
            Go to library
          </LinkButton>
          <LinkButton href={CARDS_HREF} variant="ghost" className="min-h-11">
            Read cards instead
          </LinkButton>
        </div>
      </QuizCenteredState>
    </QuizPanelBody>
  );
}

function StoriesGeneratingStep() {
  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <QuizPanelBody className="flex min-h-0 flex-1 items-center justify-center">
        <QuizCenteredState
          illustration={<PreparingScene className="w-48" />}
          title="Writing your story"
          description="Weaving your next terms into a short piece… This usually takes a few seconds."
        />
      </QuizPanelBody>
    </QuizPanel>
  );
}

function StoriesErrorStep({ session, ai }: { session: StorySession; ai: AiAccessView }) {
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
          <CreditsInsteadButton
            ai={ai}
            reason={session.errorReason}
            onSwitched={session.backToSetup}
            onError={session.setErrorMessage}
          />
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
      return <StoriesErrorStep session={session} ai={setup.ai} />;
    case "reading":
      return session.story ? (
        <StoryReader
          key={session.story.id}
          session={session}
          story={session.story}
          terms={session.terms}
          narrationAccess={setup.narrationAccess}
          narrationHighlight={setup.narrationHighlight}
          tapToPlay={setup.tapToPlay}
          shadowingSettings={setup.shadowing}
        />
      ) : null;
    default:
      return (
        <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
          {setup.collections.length === 0 ? (
            <StudyNoActiveCollectionsState paused={setup.paused} activity="reading stories" />
          ) : setup.initialDomainId === null ? (
            <StoriesNoTerms />
          ) : (
            <StorySetupPanel session={session} collections={setup.collections} ai={setup.ai} />
          )}
        </QuizPanel>
      );
  }
}
