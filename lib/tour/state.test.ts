import { describe, expect, it } from "vitest";
import { TOUR_CHAPTERS } from "./chapters";
import {
  NEW_USER_TOUR_STATE,
  isTourDone,
  pickChapter,
  resolveTourStep,
  withChapterSeen,
  withTourSkipped,
  type TourState,
} from "./state";
import { TOUR_TARGETS, type TourTargetId } from "./targets";

const visible =
  (...targets: TourTargetId[]) =>
  (target: TourTargetId) =>
    targets.includes(target);

describe("TOUR_CHAPTERS", () => {
  it("has unique ids and short chapters", () => {
    const ids = TOUR_CHAPTERS.map((chapter) => chapter.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const chapter of TOUR_CHAPTERS) {
      expect(chapter.steps.length).toBeGreaterThan(0);
      expect(chapter.steps.length).toBeLessThanOrEqual(4);
    }
  });

  it("only points at known targets", () => {
    for (const chapter of TOUR_CHAPTERS) {
      for (const step of chapter.steps) {
        expect(TOUR_TARGETS).toContain(step.target);
        if ("advanceOnTarget" in step) expect(TOUR_TARGETS).toContain(step.advanceOnTarget);
      }
    }
  });
});

describe("pickChapter", () => {
  it("opens with the overview on any of the four main pages", () => {
    for (const pathname of ["/jargon", "/jargon/read", "/jargon/review", "/jargon/quiz"]) {
      expect(
        pickChapter(pathname, NEW_USER_TOUR_STATE, visible("nav-library", "library-browse"))?.id,
      ).toBe("overview");
    }
  });

  it("moves to the page's own chapters once the overview is seen", () => {
    const state: TourState = { status: "pending", seen: ["overview"] };
    expect(pickChapter("/jargon", state, visible("nav-library", "library-browse"))?.id).toBe(
      "welcome",
    );
  });

  it("runs the welcome chapter on an empty Library", () => {
    expect(pickChapter("/jargon", NEW_USER_TOUR_STATE, visible("library-browse"))?.id).toBe(
      "welcome",
    );
  });

  it("runs the Library chapter once a collection exists", () => {
    expect(
      pickChapter("/jargon", NEW_USER_TOUR_STATE, visible("library-collections", "library-study"))
        ?.id,
    ).toBe("library");
  });

  it("waits until the first target is on screen", () => {
    expect(pickChapter("/jargon/review", NEW_USER_TOUR_STATE, visible("review-card"))).toBeNull();
  });

  it("runs the next chapter on the same page once one is seen", () => {
    const state: TourState = { status: "pending", seen: ["library"] };
    expect(
      pickChapter("/jargon", state, visible("library-collections", "library-search"))?.id,
    ).toBe("library-terms");
  });

  it("matches the route exactly", () => {
    expect(
      pickChapter("/jargon/read/stories", NEW_USER_TOUR_STATE, visible("read-card")),
    ).toBeNull();
  });

  it("skips chapters already seen", () => {
    const state: TourState = { status: "pending", seen: ["review"] };
    expect(pickChapter("/jargon/review", state, visible("review-collection"))).toBeNull();
  });

  it("never runs once the tour is done", () => {
    expect(
      pickChapter(
        "/jargon/review",
        withTourSkipped(NEW_USER_TOUR_STATE),
        visible("review-collection"),
      ),
    ).toBeNull();
  });
});

describe("tour completion", () => {
  it("is done after skipping", () => {
    expect(isTourDone(withTourSkipped(NEW_USER_TOUR_STATE))).toBe(true);
  });

  it("is done once every chapter is seen", () => {
    const state = TOUR_CHAPTERS.reduce<TourState>(
      (current, chapter) => withChapterSeen(current, chapter.id),
      NEW_USER_TOUR_STATE,
    );
    expect(state.status).toBe("done");
  });

  it("stays pending while chapters remain", () => {
    const state = withChapterSeen(NEW_USER_TOUR_STATE, "review");
    expect(state).toEqual({ status: "pending", seen: ["review"] });
    expect(isTourDone(state)).toBe(false);
  });

  it("doesn't record a chapter twice", () => {
    const once = withChapterSeen(NEW_USER_TOUR_STATE, "quiz");
    expect(withChapterSeen(once, "quiz").seen).toEqual(["quiz"]);
  });
});

describe("resolveTourStep", () => {
  const onReviewStep = (step: number) => ({
    chapterId: "review" as const,
    pathname: "/jargon/review",
    step,
  });

  it("starts a chapter at its first step", () => {
    expect(
      resolveTourStep(
        "/jargon/review",
        NEW_USER_TOUR_STATE,
        null,
        visible("review-collection", "review-card"),
      ),
    ).toMatchObject({ chapterId: "review", stepIndex: 0 });
  });

  it("moves on once the advance target appears", () => {
    expect(
      resolveTourStep(
        "/jargon/review",
        NEW_USER_TOUR_STATE,
        onReviewStep(1),
        visible("review-collection", "review-card", "review-grades"),
      ),
    ).toMatchObject({ chapterId: "review", stepIndex: 2 });
  });

  it("keeps a started chapter on its step after targets change", () => {
    expect(
      resolveTourStep("/jargon/review", NEW_USER_TOUR_STATE, onReviewStep(2), visible()),
    ).toMatchObject({ chapterId: "review", stepIndex: 2 });
  });

  it("ignores progress from another page", () => {
    expect(
      resolveTourStep("/jargon/quiz", NEW_USER_TOUR_STATE, onReviewStep(1), visible("quiz-style")),
    ).toMatchObject({ chapterId: "quiz", stepIndex: 0 });
  });

  it("shows nothing once skipped", () => {
    expect(
      resolveTourStep(
        "/jargon/review",
        withTourSkipped(NEW_USER_TOUR_STATE),
        onReviewStep(0),
        visible("review-collection"),
      ),
    ).toBeNull();
  });
});
