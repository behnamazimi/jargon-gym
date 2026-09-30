import { describe, expect, it } from "vitest";
import { TOUR_CHAPTERS } from "./chapters";
import { NEW_USER_TOUR_STATE, withTourSkipped, type TourState } from "./state";
import { TOUR_WALK, nextWalkStop } from "./walk";

const libraryDone: TourState = { status: "pending", seen: ["library"] };

describe("nextWalkStop", () => {
  it("leads from Library to Read", () => {
    expect(nextWalkStop("/jargon", libraryDone)?.label).toBe("Read");
  });

  it("skips pages whose tips are all seen", () => {
    const state: TourState = { status: "pending", seen: ["library", "read", "read-more"] };
    expect(nextWalkStop("/jargon", state)?.label).toBe("Review");
  });

  it("ends after the last page", () => {
    expect(nextWalkStop("/jargon/quiz", libraryDone)).toBeNull();
  });

  it("waits until Library's tips have been seen", () => {
    expect(nextWalkStop("/jargon/review", NEW_USER_TOUR_STATE)).toBeNull();
  });

  it("isn't offered off the walk or once the tour is done", () => {
    expect(nextWalkStop("/jargon/mastery", libraryDone)).toBeNull();
    expect(nextWalkStop("/jargon", withTourSkipped(libraryDone))).toBeNull();
  });

  it("only stops on pages that have tips", () => {
    for (const stop of TOUR_WALK) {
      const routes = TOUR_CHAPTERS.flatMap((chapter) => [chapter.route].flat());
      expect(routes).toContain(stop.route);
    }
  });
});
