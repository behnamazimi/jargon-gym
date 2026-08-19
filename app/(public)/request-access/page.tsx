import RequestAccessForm from "./request-access-form";
import { PageCenter } from "@/components/page-container";
import { getSessionUser } from "@/lib/auth/require-session";

export default async function RequestAccessPage() {
  const { user } = await getSessionUser();
  const defaultEmail = user?.email ?? "";

  return (
    <PageCenter>
      <RequestAccessForm defaultEmail={defaultEmail} emailLocked={Boolean(defaultEmail)} />
    </PageCenter>
  );
}
