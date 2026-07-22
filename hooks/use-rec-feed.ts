"use client";

import { useCallback } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchRecFeed } from "@/lib/repositories/feed";
import type { FeedPost } from "@/lib/mock/feed";

/**
 * [피드] 탭 데이터 훅 — 공개 추천 피드.
 *
 * - 인증이 확정된 뒤에만(guest·authenticated) 요청한다. 인증 loading/error 중에는 요청하지 않는다
 *   → 인증 loading 과 데이터 loading 을 분리한다(인증 loading 은 상위 HomeSkeleton 담당).
 * - loading / success / empty / error 로 정규화하고 refetch 를 제공한다.
 */
export type RecFeedState =
  | { status: "loading" }
  | { status: "success"; data: FeedPost[] }
  | { status: "empty" }
  | { status: "error" };

export function useRecFeed(): RecFeedState & { refetch: () => void } {
  const { status } = useAuth();
  const enabled = status === "guest" || status === "authenticated";
  const fetcher = useCallback((signal: AbortSignal) => fetchRecFeed(signal), []);
  const state = useAsyncData<FeedPost[]>(fetcher, enabled);

  if (state.status === "success") {
    return state.data.length > 0
      ? { status: "success", data: state.data, refetch: state.refetch }
      : { status: "empty", refetch: state.refetch };
  }
  if (state.status === "error") return { status: "error", refetch: state.refetch };
  return { status: "loading", refetch: state.refetch }; // idle · loading → 데이터 로딩
}
