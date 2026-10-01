import { describe, expect, it } from "vitest";
import { failureFor } from "./failures";

describe("failureFor", () => {
  const cases: [string, string | undefined, string][] = [
    ["closed", "requests_closed", "closed"],
    ["open request", "request_open_exists", "open_exists"],
    [
      "the unique index",
      'duplicate key value violates unique constraint "collection_requests_one_open_idx"',
      "open_exists",
    ],
    ["quota", "request_quota_reached", "quota"],
    ["invalid", "invalid_request", "invalid"],
    ["not found", "request_not_found", "not_found"],
    ["not cancellable", "request_not_cancellable", "not_found"],
    ["not waiting", "request_not_waiting", "not_waiting"],
    ["signed out", "Not authenticated", "signed_out"],
    ["anything else", "boom", "other"],
    ["nothing", undefined, "other"],
  ];

  it.each(cases)("%s", (_name, message, code) => {
    expect(failureFor({ message }).code).toBe(code);
  });
});
