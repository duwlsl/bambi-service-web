"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { resolveErrorMessage } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";
import { generateDevelopmentMorningReport } from "@/lib/repositories/development-reports";

export type DevelopmentReportGenerationState = {
  morning: {
    submit: () => void;
    submitting: boolean;
    accepted: boolean;
    errorMessage: string | null;
  };
};

/**
 * 개발용 아침 리포트 mutation 상태. 동기 락과 AbortController로 중복 요청·언마운트 후 setState를 막는다.
 */
export function useDevelopmentReportGeneration(
  onAccepted?: () => void,
): DevelopmentReportGenerationState {
  const [morningSubmitting, setMorningSubmitting] = useState(false);
  const [morningAccepted, setMorningAccepted] = useState(false);
  const [morningError, setMorningError] = useState<string | null>(null);

  const mounted = useRef(true);
  const morningInFlight = useRef(false);
  const morningAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      morningAbort.current?.abort();
    };
  }, []);

  const submitMorning = useCallback(() => {
    if (morningInFlight.current) return;
    morningInFlight.current = true;
    setMorningSubmitting(true);
    setMorningAccepted(false);
    setMorningError(null);

    const controller = new AbortController();
    morningAbort.current = controller;
    generateDevelopmentMorningReport(controller.signal)
      .then(() => {
        if (!mounted.current) return;
        setMorningAccepted(true);
        onAccepted?.();
      })
      .catch((error: unknown) => {
        if (!mounted.current || controller.signal.aborted) return;
        setMorningError(resolveErrorMessage(error instanceof ApiError ? error.code : null));
      })
      .finally(() => {
        morningInFlight.current = false;
        if (mounted.current) setMorningSubmitting(false);
      });
  }, [onAccepted]);

  return {
    morning: {
      submit: submitMorning,
      submitting: morningSubmitting,
      accepted: morningAccepted,
      errorMessage: morningError,
    },
  };
}
