import { getGoalsPageData } from "@/app/(private)/app/goals/actions";
import { GoalsPage } from "@/components/goals/goals-page";
import { PageCenter } from "@/components/page-container";
import { withReveal } from "@/components/shared/view-transitions";

async function GoalsRoute() {
  const data = await getGoalsPageData();

  if ("error" in data) {
    return (
      <PageCenter>
        <p className="text-sm text-base-content/70">{data.error}</p>
      </PageCenter>
    );
  }

  return <GoalsPage settings={data.settings} day={data.day} />;
}

export default withReveal(GoalsRoute);
