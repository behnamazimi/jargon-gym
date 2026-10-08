"use client";

import { useCallback, useState } from "react";
import { saveReviewOptionAction } from "@/app/(private)/app/review/actions";
import { useToast } from "@/components/ui/toast";
import type { ReviewOptionKey, ReviewOptions } from "@/lib/review/options";

/** Review's saved options. A change shows at once and rolls back if saving fails. */
export function useReviewOptions(initialOptions: ReviewOptions) {
  const { toast } = useToast();
  const [options, setOptions] = useState(initialOptions);

  const changeOption = useCallback(
    async (key: ReviewOptionKey, value: boolean) => {
      setOptions((current) => ({ ...current, [key]: value }));
      const result = await saveReviewOptionAction(key, value);
      if (result.error) {
        setOptions((current) => ({ ...current, [key]: !value }));
        toast(result.error, "destructive");
      }
    },
    [toast],
  );

  return { options, changeOption };
}
