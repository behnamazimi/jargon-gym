import { describe, expect, it } from "vitest";
import { TOUR_CHAPTERS } from "./chapters";
import { NEW_USER_TOUR_STATE, withTourSkipped, type TourState } from "./state";
import { TOUR_WALK, nextWalkStop } from "./walk";

const libraryDone: TourState = { status: "pending", seen: ["library"] };

describe("nextWalkStop", () => {
  it("leads from Library to Read", () => {
    expect(nextWalkStop("/app/library", libraryDone)?.label).toBe("Read");
  });

  it("skips pages whose tips are all seen", () => {
    const state: TourState = { status: "pending", seen: ["library", "read", "read-more"] };
    expect(nextWalkStop("/app/library", state)?.label).toBe("Review");
  });

  it("ends after the last page", () => {
    expect(nextWalkStop("/app/quiz", libraryDone)).toBeNull();
  });

  it("waits until Library's tips have been seen", () => {
    expect(nextWalkStop("/app/review", NEW_USER_TOUR_STATE)).toBeNull();
  });

  it("isn't offered off the walk or once the tour is done", () => {
    expect(nextWalkStop("/app/mastery", libraryDone)).toBeNull();
    expect(nextWalkStop("/app/library", withTourSkipped(libraryDone))).toBeNull();
  });

  it("only stops on pages that have tips", () => {
    for (const stop of TOUR_WALK) {
      const routes = TOUR_CHAPTERS.flatMap((chapter) => [chapter.route].flat());
      expect(routes).toContain(stop.route);
    }
  });
});
