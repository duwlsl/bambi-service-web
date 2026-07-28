"use client";

import { useCallback } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchWikiInterests } from "@/lib/repositories/wiki";
import type { WikiInterest } from "@/types/wiki";

/**
 * [AI가 이해한 관심사] 데이터 훅 — member 전용.
 * repository seam(fetchWikiInterests)만 소비한다(mock 직접 import 금지). 실 경로는 미확정.
 * authenticated 에서만 요청하고, loading / success / empty / error + refetch 로 정규화한다.
 */
export type WikiInterestsState =
  | { status: "loading" }
  | { status: "success"; data: WikiInterest[] }
  | { status: "empty" }
  | { status: "error" };

export function useWikiInterests(): WikiInterestsState & { refetch: () => void } {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const fetcher = useCallback((signal: AbortSignal) => fetchWikiInterests(signal), []);
  const state = useAsyncData<WikiInterest[]>(fetcher, enabled);

  if (state.status === "success") {
    return state.data.length > 0
      ? { status: "success", data: state.data, refetch: state.refetch }
      : { status: "empty", refetch: state.refetch };
  }
  if (state.status === "error") return { status: "error", refetch: state.refetch };
  return { status: "loading", refetch: state.refetch }; // idle · loading → 데이터 로딩
}
