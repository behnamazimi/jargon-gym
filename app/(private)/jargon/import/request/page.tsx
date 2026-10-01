import { Inbox } from "lucide-react";
import { getImportSetupData } from "@/app/(private)/jargon/import/actions";
import { RequestForm, type RecentRequest } from "@/components/requests/request-form";
import { PageHeader } from "@/components/jargon/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/require-session";
import { REQUEST_COPY } from "@/lib/requests/copy";
import { blockedMessage, entryFor } from "@/lib/requests/entry";
import { fetchMyRequests, fetchRequestQuota } from "@/lib/requests/repository";
import { statusSentence } from "@/lib/requests/status";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";

type PageProps = { searchParams: Promise<{ topic?: string }> };

export default async function RequestPage({ searchParams }: PageProps) {
  const { topic = "" } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) return <p className="text-sm text-base-content/60">{REQUEST_COPY.form.signedOut}</p>;

  const header = (
    <PageHeader
      icon={Inbox}
      title={REQUEST_COPY.form.title}
      description={REQUEST_COPY.form.intro}
      backHref="/jargon/import"
      backLabel="Add a collection"
      compactOnPhone
    />
  );

  try {
    const { timezone } = await getStudyPhoneUserSettings(user.id);
    const [quota, requests, setup] = await Promise.all([
      fetchRequestQuota(supabase),
      fetchMyRequests(supabase, timezone),
      getImportSetupData(),
    ]);
    const entry = entryFor(quota, timezone);
    const blocked = blockedMessage(entry);

    if (entry.state !== "available" || blocked) {
      return (
        <>
          {header}
          <Alert>
            <AlertDescription role="status">{blocked}</AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/jargon" className="min-h-11">
              {REQUEST_COPY.form.seeLibrary}
            </LinkButton>
            <LinkButton href="/jargon/browse" variant="outline" className="min-h-11">
              {REQUEST_COPY.card.browse}
            </LinkButton>
          </div>
        </>
      );
    }

    const recent: RecentRequest[] = requests.map((request) => ({
      key: request.topic.trim().toLowerCase(),
      topic: request.topic,
      createdDate: request.createdDate,
      sentence: statusSentence(request),
      collectionId: request.displayStatus === "ready" ? request.deliveredDomainId : null,
    }));
    const ownedNames = "error" in setup ? [] : setup.collections.map((c) => c.name);

    return (
      <>
        {header}
        <RequestForm
          initialTopic={topic.slice(0, 120)}
          estimateDays={entry.estimateDays}
          paused={entry.paused}
          used={entry.used}
          recent={recent}
          ownedNames={ownedNames}
        />
      </>
    );
  } catch (error) {
    console.error("Couldn't load the request form:", error);
    return (
      <>
        {header}
        <p className="text-sm text-base-content/60">{REQUEST_COPY.form.sendFailed}</p>
      </>
    );
  }
}
