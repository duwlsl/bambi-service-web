"use client";

import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { usePolledData } from "@/hooks/use-polled-data";
import { fetchMyReports } from "@/lib/repositories/my-reports";
import type { MyReport } from "@/types/report";

/**
 * 홈 [내 보고서] 생성 작업(job) 상태 훅 — member 전용. PREPARING(생성 중)·ERROR(생성 실패)를 함께 다룬다.
 * repository seam(fetchMyReports)을 **한 번만** 조회하고 status 로 파생 분리한다
 * (PREPARING·ERROR 를 각각 다시 조회하지 않는다 — 같은 MyReport[] 중복 fetch 금지).
 * READY 완료 보고서는 별도 데이터 경로(useMemberFeed = GET /api/feed)라 여기 포함하지 않는다.
 *
 * - preparing: status === "PREPARING" (처리중 슬롯)
 * - failed:    status === "ERROR"     (생성 실패 카드)
 * - 둘 다 0건이어도 error 가 아니면 ready(빈 배열) — Empty 판단은 상위(홈)가 READY 까지 합쳐 내린다.
 */
export type MyReportJobsState =
  | { status: "loading"; refetch: () => Promise<void> }
  | { status: "error"; refetch: () => Promise<void> }
  | { status: "ready"; preparing: MyReport[]; failed: MyReport[]; refetch: () => Promise<void> };

export function useMyReportJobs(onCompleted?: () => void): MyReportJobsState {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const fetcher = useCallback((signal: AbortSignal) => fetchMyReports(signal), []);
  const selectInterval = useCallback(
    (reports: MyReport[]) => reports.some((report) => report.status === "PREPARING") ? 5_000 : 30_000,
    [],
  );
  const state = usePolledData<MyReport[]>(fetcher, enabled, 30_000, selectInterval);
  const knownCompleted = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled) {
      knownCompleted.current = null;
      return;
    }
    if (state.status !== "success" || !state.data) return;
    const completed = new Set(
      state.data.filter((report) => report.status === "READY").map((report) => report.id),
    );
    if (knownCompleted.current === null) {
      knownCompleted.current = completed;
      return;
    }
    const hasNewCompletion = [...completed].some((id) => !knownCompleted.current?.has(id));
    knownCompleted.current = completed;
    if (hasNewCompletion) onCompleted?.();
  }, [enabled, onCompleted, state.status, state.data]);

  if (state.status === "success") {
    const reports = state.data ?? [];
    return {
      status: "ready",
      preparing: reports.filter((report) => report.status === "PREPARING"),
      failed: reports.filter((report) => report.status === "ERROR"),
      refetch: state.refetch,
    };
  }
  if (state.status === "error") return { status: "error", refetch: state.refetch };
  return { status: "loading", refetch: state.refetch }; // idle · loading → 데이터 로딩
}
