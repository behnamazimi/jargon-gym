import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSection } from "@/components/admin/admin-section";
import { FulfilPanel } from "@/components/admin/requests/fulfil-panel";
import { RequestActions } from "@/components/admin/requests/request-actions";
import { RequestDetail } from "@/components/admin/requests/request-detail";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { isUuid } from "@/lib/admin/list-params";
import { describeRequestShape } from "@/lib/admin/requests/labels";
import {
  findSimilarCollections,
  findSimilarRequests,
  getRequestDetail,
} from "@/lib/admin/requests/queries";
import { parseLanguage } from "@/lib/jargon/languages";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminRequestPage({ params }: PageProps) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const request = await getRequestDetail(supabase, id);
  if (!request) notFound();

  const open = ["requested", "in_progress", "needs_input", "merged"].includes(request.status);
  const [similarCollections, similarRequests] = open
    ? await Promise.all([
        findSimilarCollections(supabase, request.topic),
        findSimilarRequests(supabase, request),
      ])
    : [[], []];

  return (
    <>
      <AdminPageHeader
        title={request.topic}
        description={describeRequestShape(request)}
        actions={
          <Link href="/admin/requests" className="btn btn-sm btn-ghost">
            All requests
          </Link>
        }
      />
      <RequestDetail request={request} />
      <AdminSection id="request-actions" title="Actions">
        <RequestActions
          request={request}
          similarRequests={similarRequests}
          similarCollections={similarCollections}
        />
        {open && (similarCollections.length > 0 || similarRequests.length > 0) ? (
          <p className="m-0 text-sm text-base-content/65">
            Similar:{" "}
            {[
              ...similarRequests.map((r) => r.topic),
              ...similarCollections.map((c) => `${c.name} (Browse)`),
            ].join(", ")}
          </p>
        ) : null}
      </AdminSection>
      {request.status === "in_progress" ? (
        <AdminSection
          id="request-fulfil"
          title="Fulfil"
          description="Paste the collection you prepared. It's checked the same way people check their own lists."
        >
          <FulfilPanel
            requestId={request.id}
            topic={request.topic}
            language={parseLanguage(request.language)}
            people={request.merged.length + 1}
            knownTerms={request.knownTerms}
          />
        </AdminSection>
      ) : null}
    </>
  );
}
