import { REQUEST_COPY } from "./copy";

export type RequestFailure =
  | {
      code:
        | "closed"
        | "open_exists"
        | "quota"
        | "invalid"
        | "not_found"
        | "not_waiting"
        | "nothing_to_define"
        | "other";
    }
  | { code: "signed_out" };

/** What the request functions raised, as a code. The text of a database error is never shown. */
export function failureFor(error: { message?: string } | null | undefined): RequestFailure {
  const text = error?.message ?? "";
  if (text.includes("Not authenticated")) return { code: "signed_out" };
  if (text.includes("requests_closed")) return { code: "closed" };
  if (text.includes("request_open_exists") || text.includes("collection_requests_one_open_idx")) {
    return { code: "open_exists" };
  }
  if (text.includes("request_quota_reached")) return { code: "quota" };
  if (text.includes("invalid_request")) return { code: "invalid" };
  if (text.includes("request_not_found") || text.includes("request_not_cancellable")) {
    return { code: "not_found" };
  }
  if (text.includes("request_not_waiting")) return { code: "not_waiting" };
  if (text.includes("nothing_to_define")) return { code: "nothing_to_define" };
  return { code: "other" };
}

export function failureMessage(failure: RequestFailure): string {
  switch (failure.code) {
    case "closed":
      return REQUEST_COPY.form.closed;
    case "signed_out":
      return REQUEST_COPY.form.signedOut;
    case "not_waiting":
      return REQUEST_COPY.card.notReplyable;
    case "nothing_to_define":
      return REQUEST_COPY.definitions.nothingToDefine;
    case "not_found":
    case "invalid":
      return REQUEST_COPY.card.actionFailed;
    case "open_exists":
    case "quota":
    case "other":
      return REQUEST_COPY.form.sendFailed;
  }
}
