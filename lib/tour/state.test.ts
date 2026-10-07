import { describe, expect, it } from "vitest";
import { TOUR_CHAPTERS } from "./chapters";
import {
  NEW_USER_TOUR_STATE,
  isTourDone,
  pickChapter,
  resolveTourStep,
  holdsChaptersForNextVisit,
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
  it("runs the welcome chapter on an empty Library", () => {
    expect(pickChapter("/app/library", NEW_USER_TOUR_STATE, visible("library-browse"))?.id).toBe(
      "welcome",
    );
  });

  it("holds the header tips back on an empty Library, so welcome comes first", () => {
    const onEmptyLibrary = visible("library-browse", "library-import", "app-streak", "app-account");
    expect(pickChapter("/app/library", NEW_USER_TOUR_STATE, onEmptyLibrary)?.id).toBe("welcome");

    const welcomeSeen: TourState = { status: "pending", seen: ["welcome"] };
    expect(pickChapter("/app/library", welcomeSeen, onEmptyLibrary)).toBeNull();
  });

  it("shows the header tips once the Library chapters have run", () => {
    const state: TourState = { status: "pending", seen: ["library", "library-terms"] };
    expect(pickChapter("/app/library", state, visible("app-streak", "app-account"))?.id).toBe(
      "app",
    );
  });

  it("runs the Library chapter once a collection exists", () => {
    expect(
      pickChapter("/app/library", NEW_USER_TOUR_STATE, visible("library-collections"))?.id,
    ).toBe("library");
  });

  it("waits until the first target is on screen", () => {
    expect(pickChapter("/app/review", NEW_USER_TOUR_STATE, visible("review-card"))).toBeNull();
  });

  it("runs the next chapter on the same page once one is seen", () => {
    const state: TourState = { status: "pending", seen: ["library"] };
    expect(
      pickChapter("/app/library", state, visible("library-collections", "library-search"))?.id,
    ).toBe("library-terms");
  });

  it("matches the route exactly", () => {
    expect(pickChapter("/app/read/stories", NEW_USER_TOUR_STATE, visible("read-card"))).toBeNull();
  });

  it("skips chapters already seen", () => {
    const state: TourState = { status: "pending", seen: ["review"] };
    expect(pickChapter("/app/review", state, visible("review-collection"))).toBeNull();
  });

  it("never runs once the tour is done", () => {
    expect(
      pickChapter(
        "/app/review",
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

  it("starts a chapter at its first step", () => {
    expect(
      resolveTourStep(
        "/app/review",
        NEW_USER_TOUR_STATE,
        null,
        visible("review-collection", "review-card"),
      ),
    ).toMatchObject({ chapterId: "review", stepIndex: 0 });
  });

  it("moves on once the advance target appears", () => {
    expect(
      resolveTourStep(
        "/app/review",
        NEW_USER_TOUR_STATE,
        atReviewStep(1),
        visible("review-collection", "review-card", "review-grades"),
      ),
    ).toMatchObject({ chapterId: "review", stepIndex: 2 });
  });

  it("waits on a step whose target may come back, without restarting the chapter", () => {
    expect(
      resolveTourStep(
        "/app/review",
        NEW_USER_TOUR_STATE,
        atReviewStep(2),
        visible("review-collection", "review-card"),
      ),
    ).toBeNull();
  });

  it("skips a step whose target is gone when a later one is on screen", () => {
    const progress = { chapterId: "library-terms" as const, step: 1 };
    const state: TourState = { status: "pending", seen: ["library"] };
    expect(
      resolveTourStep(
        "/app/library",
        state,
        progress,
        visible("library-search", "library-actions"),
      ),
    ).toMatchObject({ chapterId: "library-terms", stepIndex: 2 });
  });

  it("lets the page's other chapters run when a started one is stuck", () => {
    const progress = { chapterId: "welcome" as const, step: 1 };
    expect(
      resolveTourStep(
        "/app/library",
        NEW_USER_TOUR_STATE,
        progress,
        visible("library-collections"),
      ),
    ).toMatchObject({ chapterId: "library", stepIndex: 0 });
  });

  it("shows nothing once skipped", () => {
    expect(
      resolveTourStep(
        "/app/review",
        withTourSkipped(NEW_USER_TOUR_STATE),
        atReviewStep(0),
        visible("review-collection"),
      ),
    ).toBeNull();
  });
});

describe("tourTargetsOn", () => {
  it("watches this page's remaining targets", () => {
    const state: TourState = NEW_USER_TOUR_STATE;
    expect(tourTargetsOn("/app/review", state)).toEqual([
      "review-collection",
      "review-card",
      "review-grades",
    ]);
  });

  it("watches nothing once the page's chapters are seen or the tour is done", () => {
    expect(tourTargetsOn("/app/quiz", { status: "pending", seen: ["quiz"] })).toEqual([]);
    expect(tourTargetsOn("/app/review", withTourSkipped(NEW_USER_TOUR_STATE))).toEqual([]);
  });

  it("never watches outside the app", () => {
    expect(tourTargetsOn("/", NEW_USER_TOUR_STATE)).toEqual([]);
  });
});

describe("holdsChaptersForNextVisit", () => {
  it("holds the page's other chapters after one finishes, except on Library", () => {
    expect(holdsChaptersForNextVisit("/app/read", "/app/read")).toBe(true);
    expect(holdsChaptersForNextVisit("/app/library", "/app/library")).toBe(false);
    expect(holdsChaptersForNextVisit("/app/read", null)).toBe(false);
  });
});
