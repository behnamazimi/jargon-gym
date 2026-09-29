import { describe, expect, it } from "vitest";
import { auditHref, parseAuditParams } from "./audit-params";

describe("parseAuditParams", () => {
  it("defaults to every action, page one", () => {
    expect(parseAuditParams({})).toEqual({ action: null, page: 1 });
  });

  it("accepts known actions from either the app or the database, and ignores others", () => {
    expect(parseAuditParams({ action: "app.collection_slug" }).action).toBe("app.collection_slug");
    expect(parseAuditParams({ action: "grant_ai_credits" }).action).toBe("grant_ai_credits");
    expect(parseAuditParams({ action: "drop table" }).action).toBeNull();
  });

  it("bounds the page", () => {
    expect(parseAuditParams({ page: "-3" }).page).toBe(1);
    expect(parseAuditParams({ page: "999999999" }).page).toBe(100_000);
  });
});

describe("auditHref", () => {
  it("keeps only what is set", () => {
    expect(auditHref({})).toBe("/admin/system/audit");
    expect(auditHref({ action: "publish_collection", page: 2 })).toBe(
      "/admin/system/audit?action=publish_collection&page=2",
    );
  });
});
