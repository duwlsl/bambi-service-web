"use client";

import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { usePolledData } from "@/hooks/use-polled-data";
import { fetchWikiBuildStatus } from "@/lib/repositories/wiki";
import type { WikiBuildStatusData } from "@/types/wiki";

export type WikiBuildStatusState =
  | { status: "loading"; refetch: () => Promise<void> }
  | { status: "error"; refetch: () => Promise<void> }
  | { status: "ready"; data: WikiBuildStatusData; refetch: () => Promise<void> };

/**
 * 개인 LLM Wiki 빌드 상태를 조건부 polling 한다.
 * 활성 빌드는 5초, 유휴·실패 상태는 30초 간격이며 BUILDING→IDLE 완료 전환에서 그래프를 갱신한다.
 */
export function useWikiBuildStatus(onCompleted?: () => void): WikiBuildStatusState {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const fetcher = useCallback((signal: AbortSignal) => fetchWikiBuildStatus(signal), []);
  const selectInterval = useCallback(
    (data: WikiBuildStatusData) => data.status === "BUILDING" ? 5_000 : 30_000,
    [],
  );
  const state = usePolledData(fetcher, enabled, 30_000, selectInterval);
  const previousStatus = useRef<WikiBuildStatusData["status"] | null>(null);

  useEffect(() => {
    if (!enabled) {
      previousStatus.current = null;
      return;
    }
    if (state.status !== "success" || !state.data) return;
    const completed = previousStatus.current === "BUILDING" && state.data.status === "IDLE";
    previousStatus.current = state.data.status;
    if (completed) onCompleted?.();
  }, [enabled, onCompleted, state.status, state.data]);

  if (state.status === "success" && state.data) {
    return { status: "ready", data: state.data, refetch: state.refetch };
  }
  if (state.status === "error") return { status: "error", refetch: state.refetch };
  return { status: "loading", refetch: state.refetch };
}
