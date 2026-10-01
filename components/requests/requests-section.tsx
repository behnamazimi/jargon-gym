import { RequestCard } from "@/components/requests/request-card";
import type { MyRequest } from "@/lib/requests/types";

/** The person's requests, above everything else in the Library. Not collections, so not in the sidebar. */
export function RequestsSection({ requests }: { requests: MyRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}
