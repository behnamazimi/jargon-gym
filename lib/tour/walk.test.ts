import { describe, expect, it } from "vitest";
import { TOUR_CHAPTERS } from "./chapters";
import { NEW_USER_TOUR_STATE, withTourSkipped, type TourState } from "./state";
import { TOUR_WALK, nextWalkStop } from "./walk";

describe("nextWalkStop", () => {
  it("leads from Library to Read", () => {
    expect(nextWalkStop("/jargon", NEW_USER_TOUR_STATE)?.label).toBe("Read");
  });

  it("skips pages whose tips are all seen", () => {
    const state: TourState = { status: "pending", seen: ["overview", "read", "read-more"] };
    expect(nextWalkStop("/jargon", state)?.label).toBe("Review");
  });

  it("ends after the last page", () => {
    expect(nextWalkStop("/jargon/quiz", NEW_USER_TOUR_STATE)).toBeNull();
  });

  it("isn't offered off the walk or once the tour is done", () => {
    expect(nextWalkStop("/jargon/mastery", NEW_USER_TOUR_STATE)).toBeNull();
    expect(nextWalkStop("/jargon", withTourSkipped(NEW_USER_TOUR_STATE))).toBeNull();
  });

  it("only stops on pages that have tips", () => {
    for (const stop of TOUR_WALK) {
      const routes = TOUR_CHAPTERS.flatMap((chapter) =>
        typeof chapter.route === "string" ? [chapter.route] : chapter.route,
      );
      expect(routes).toContain(stop.route);
    }
  });
});
