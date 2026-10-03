import { describe, expect, it } from "vitest";
import { STUDY_DOCK_TABS } from "@/components/app/account-nav";
import type { SettingsTabId } from "@/components/settings/ui-layout";
import { TOUR_TARGETS } from "./targets";

// Some anchors are built from other names (`nav-${label}`, `settings-${id}`);
// these keep a rename there from silently dropping a tour step.
describe("derived tour targets", () => {
  it("has a nav target for every dock tab, and no others", () => {
    const fromTabs = STUDY_DOCK_TABS.map((tab) => `nav-${tab.label.toLowerCase()}`).toSorted();
    const navTargets = TOUR_TARGETS.filter((id) => id.startsWith("nav-")).toSorted();
    expect(navTargets).toEqual(fromTabs);
  });

  it("points at a real settings panel", () => {
    const aiPanel: SettingsTabId = "ai";
    expect(TOUR_TARGETS).toContain(`settings-${aiPanel}`);
  });
});
