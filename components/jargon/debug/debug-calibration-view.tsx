import type { CalibrationViewData } from "@/app/(private)/jargon/debug/actions";
import { ActivityTimeline } from "./debug-calibration-tables";
import {
  AbandonedReveals,
  PredictionAccuracy,
  TraceConstantsPanel,
} from "./debug-calibration-panels";

export function DebugCalibrationView({ data }: { data: CalibrationViewData | null }) {
  if (!data) {
    return <p className="m-0 text-sm text-base-content/60">No calibration data available.</p>;
  }

  return (
    <>
      <ActivityTimeline days={data.activityTimeline} />
      <PredictionAccuracy data={data} />
      <AbandonedReveals data={data} />
      <TraceConstantsPanel />
    </>
  );
}
