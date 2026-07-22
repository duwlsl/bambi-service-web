"use client";

import { useCallback } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchMyReports } from "@/lib/repositories/feed";
import type { ReportGroup } from "@/lib/mock/feed";

/**
 * [내 보고서] 탭 데이터 훅 — 로그인 사용자 보고서 그룹.
 * FeedMine 은 member 에서만 마운트되지만, 인증 확정(guest·authenticated) 뒤에만 요청하도록
 * enabled 를 동일하게 적용한다. loading / success / empty / error + refetch.
 */
export type MyReportsState =
  | { status: "loading" }
  | { status: "success"; data: ReportGroup[] }
  | { status: "empty" }
  | { status: "error" };

export function useMyReports(): MyReportsState & { refetch: () => void } {
  const { status } = useAuth();
  const enabled = status === "guest" || status === "authenticated";
  const fetcher = useCallback((signal: AbortSignal) => fetchMyReports(signal), []);
  const state = useAsyncData<ReportGroup[]>(fetcher, enabled);

  if (state.status === "success") {
    return state.data.length > 0
      ? { status: "success", data: state.data, refetch: state.refetch }
      : { status: "empty", refetch: state.refetch };
  }
  if (state.status === "error") return { status: "error", refetch: state.refetch };
  return { status: "loading", refetch: state.refetch }; // idle · loading → 데이터 로딩
}
