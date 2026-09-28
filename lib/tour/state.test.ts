import { describe, expect, it } from "vitest";
import { TOUR_CHAPTERS } from "./chapters";
import {
  NEW_USER_TOUR_STATE,
  isTourDone,
  pickChapter,
  resolveTourStep,
  tourTargetsOn,
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
  const atReviewStep = (step: number) => ({ chapterId: "review" as const, step });
  const overviewSeen: TourState = { status: "pending", seen: ["overview"] };

  it("starts a chapter at its first step", () => {
    expect(
      resolveTourStep(
        "/jargon/review",
        overviewSeen,
        null,
        visible("review-collection", "review-card"),
      ),
    ).toMatchObject({ chapterId: "review", stepIndex: 0 });
  });

  it("moves on once the advance target appears", () => {
    expect(
      resolveTourStep(
        "/jargon/review",
        overviewSeen,
        atReviewStep(1),
        visible("review-collection", "review-card", "review-grades"),
      ),
    ).toMatchObject({ chapterId: "review", stepIndex: 2 });
  });

  it("waits on a step whose target may come back, without restarting the chapter", () => {
    expect(
      resolveTourStep(
        "/jargon/review",
        overviewSeen,
        atReviewStep(2),
        visible("review-collection", "review-card"),
      ),
    ).toBeNull();
  });

  it("skips a step whose target is gone when a later one is on screen", () => {
    const progress = { chapterId: "library-terms" as const, step: 1 };
    const state: TourState = { status: "pending", seen: ["overview", "library"] };
    expect(
      resolveTourStep("/jargon", state, progress, visible("library-search", "library-actions")),
    ).toMatchObject({ chapterId: "library-terms", stepIndex: 2 });
  });

  it("lets the page's other chapters run when a started one is stuck", () => {
    const progress = { chapterId: "welcome" as const, step: 1 };
    expect(
      resolveTourStep(
        "/jargon",
        { status: "pending", seen: ["overview"] },
        progress,
        visible("library-collections", "library-study"),
      ),
    ).toMatchObject({ chapterId: "library", stepIndex: 0 });
  });

  it("carries the overview across the pages it runs on", () => {
    const progress = { chapterId: "overview" as const, step: 2 };
    expect(
      resolveTourStep(
        "/jargon/read",
        NEW_USER_TOUR_STATE,
        progress,
        visible("nav-library", "nav-read", "nav-review", "nav-quiz"),
      ),
    ).toMatchObject({ chapterId: "overview", stepIndex: 2 });
  });

  it("shows nothing once skipped", () => {
    expect(
      resolveTourStep(
        "/jargon/review",
        withTourSkipped(NEW_USER_TOUR_STATE),
        atReviewStep(0),
        visible("review-collection"),
      ),
    ).toBeNull();
  });
});

describe("tourTargetsOn", () => {
  it("watches this page's remaining targets", () => {
    const state: TourState = { status: "pending", seen: ["overview"] };
    expect(tourTargetsOn("/jargon/review", state)).toEqual([
      "review-collection",
      "review-card",
      "review-grades",
    ]);
  });

  it("watches nothing once the page's chapters are seen or the tour is done", () => {
    expect(
      tourTargetsOn("/jargon/quiz", { status: "pending", seen: ["overview", "quiz"] }),
    ).toEqual([]);
    expect(tourTargetsOn("/jargon/review", withTourSkipped(NEW_USER_TOUR_STATE))).toEqual([]);
  });
});
