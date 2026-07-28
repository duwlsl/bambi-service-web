"use client";

import { useCallback } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchMyReports } from "@/lib/repositories/my-reports";
import type { MyReport } from "@/types/report";

/**
 * 홈 [내 보고서] "생성 중(PREPARING)" 보고서 훅 — member 전용.
 * repository seam(fetchMyReports)만 소비한다(mock 직접 import 금지). 실 경로 미확정.
 * 기존 상태값 status 에서 PREPARING 을 파생 필터한다(별도 boolean isProcessing 없음).
 * PREPARING 이 0건이면 empty — 처리중 슬롯은 노출되지 않는다.
 */
export type PreparingReportsState =
  | { status: "loading" }
  | { status: "success"; data: MyReport[] }
  | { status: "empty" }
  | { status: "error" };

export function usePreparingReports(): PreparingReportsState {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const fetcher = useCallback((signal: AbortSignal) => fetchMyReports(signal), []);
  const state = useAsyncData<MyReport[]>(fetcher, enabled);

  if (state.status === "success") {
    const preparing = state.data.filter((report) => report.status === "PREPARING");
    return preparing.length > 0 ? { status: "success", data: preparing } : { status: "empty" };
  }
  if (state.status === "error") return { status: "error" };
  return { status: "loading" }; // idle · loading → 데이터 로딩
}
