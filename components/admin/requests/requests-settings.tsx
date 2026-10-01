"use client";

import { useState } from "react";
import { saveRequestSettings } from "@/app/(private)/admin/requests/delivery-actions";
import { AdminSettingRow } from "@/components/admin/admin-setting-row";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { RequestSettings } from "@/lib/admin/requests/queries";

function Days({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span>{label}</span>
      <input
        type="number"
        min={1}
        max={max}
        inputMode="numeric"
        className="input input-bordered input-sm w-20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function RequestsSettings({ settings }: { settings: RequestSettings }) {
  const [estimate, setEstimate] = useState(String(settings.estimateDays));
  const [slower, setSlower] = useState(String(settings.pausedEstimateDays));
  const { run, isPending, error } = useAdminAction();

  const save = (patch: Partial<RequestSettings>) => saveRequestSettings({ ...settings, ...patch });
  const estimateDays = Number(estimate);
  const pausedEstimateDays = Number(slower);
  const dirty =
    estimateDays !== settings.estimateDays || pausedEstimateDays !== settings.pausedEstimateDays;

  return (
    <div className="flex flex-col gap-2">
      <AdminSettingRow
        title="Accept new requests"
        description="Off hides the request form everywhere. Requests already sent keep their cards and emails."
        control={
          <AdminSwitch
            value={settings.enabled}
            label="Accept new requests"
            save={(next) => save({ enabled: next })}
          />
        }
      />
      <AdminSettingRow
        title="Slower than usual"
        description="Shows a banner and gives new requests the longer estimate. Requests already sent keep their dates."
        control={
          <AdminSwitch
            value={settings.paused}
            label="Slower than usual"
            save={(next) => save({ paused: next })}
          />
        }
      />
      <AdminSettingRow
        title="Estimates"
        description="Days people are told to expect."
        notes={
          error ? (
            <p role="alert" className="m-0 text-sm text-error">
              {error}
            </p>
          ) : null
        }
        control={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Days label="Usual" value={estimate} max={30} onChange={setEstimate} />
            <Days label="Slower" value={slower} max={60} onChange={setSlower} />
            <Button
              type="button"
              size="sm"
              isDisabled={!dirty || isPending}
              onPress={() => void run(() => save({ estimateDays, pausedEstimateDays }))}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />
    </div>
  );
}
