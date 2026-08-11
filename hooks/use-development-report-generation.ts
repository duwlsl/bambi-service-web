"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ERROR_CODES, resolveErrorMessage } from "@/constants/errors";
import type { WikiInterestsState } from "@/hooks/use-wiki-interests";
import { ApiError } from "@/lib/api-client";
import {
  generateDevelopmentMorningReport,
  generateDevelopmentWikiInterestReport,
} from "@/lib/repositories/development-reports";
import type { WikiTag } from "@/types/wiki";

export type DevelopmentReportGenerationState = {
  morning: {
    submit: () => void;
    submitting: boolean;
    accepted: boolean;
    errorMessage: string | null;
  };
  wiki: {
    selected: WikiTag | null;
    select: (tag: WikiTag) => void;
    submit: () => void;
    submitting: boolean;
    accepted: boolean;
    errorMessage: string | null;
    canSubmit: boolean;
  };
};

/**
 * 개발용 아침·Wiki 리포트 mutation 상태. 두 버튼은 서로 다른 동기 락과 AbortController를 써
 * 한쪽 생성 중에도 다른 경로를 독립적으로 검증할 수 있다.
 */
export function useDevelopmentReportGeneration(
  wikiInterests: WikiInterestsState & { refetch: () => void },
  onAccepted?: () => void,
): DevelopmentReportGenerationState {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [morningSubmitting, setMorningSubmitting] = useState(false);
  const [morningAccepted, setMorningAccepted] = useState(false);
  const [morningError, setMorningError] = useState<string | null>(null);
  const [wikiSubmitting, setWikiSubmitting] = useState(false);
  const [wikiAccepted, setWikiAccepted] = useState(false);
  const [wikiError, setWikiError] = useState<string | null>(null);

  const mounted = useRef(true);
  const morningInFlight = useRef(false);
  const wikiInFlight = useRef(false);
  const morningAbort = useRef<AbortController | null>(null);
  const wikiAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      morningAbort.current?.abort();
      wikiAbort.current?.abort();
    };
  }, []);

  const tags = wikiInterests.status === "success" ? wikiInterests.data : null;
  const selected = tags?.find((tag) => tag.tagId === selectedTagId) ?? null;

  const select = useCallback((tag: WikiTag) => {
    setSelectedTagId(tag.tagId);
    setWikiAccepted(false);
    setWikiError(null);
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

  const submitWiki = useCallback(() => {
    if (wikiInFlight.current) return;
    const current = tags?.find((tag) => tag.tagId === selectedTagId) ?? null;
    if (current === null) return;

    wikiInFlight.current = true;
    setWikiSubmitting(true);
    setWikiAccepted(false);
    setWikiError(null);

    const controller = new AbortController();
    wikiAbort.current = controller;
    generateDevelopmentWikiInterestReport({ tagId: current.tagId }, controller.signal)
      .then(() => {
        if (!mounted.current) return;
        setWikiAccepted(true);
        onAccepted?.();
      })
      .catch((error: unknown) => {
        if (!mounted.current || controller.signal.aborted) return;
        const code = error instanceof ApiError ? error.code : null;
        if (code === ERROR_CODES.INTEREST_NOT_FOUND) {
          setSelectedTagId(null);
          wikiInterests.refetch();
        }
        setWikiError(resolveErrorMessage(code));
      })
      .finally(() => {
        wikiInFlight.current = false;
        if (mounted.current) setWikiSubmitting(false);
      });
  }, [tags, selectedTagId, wikiInterests, onAccepted]);

  return {
    morning: {
      submit: submitMorning,
      submitting: morningSubmitting,
      accepted: morningAccepted,
      errorMessage: morningError,
    },
    wiki: {
      selected,
      select,
      submit: submitWiki,
      submitting: wikiSubmitting,
      accepted: wikiAccepted,
      errorMessage: wikiError,
      canSubmit: selected !== null && !wikiSubmitting,
    },
  };
}
