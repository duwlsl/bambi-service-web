"use client";

import { useCallback } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchCardDetail, type CardDetailResult } from "@/lib/repositories/report";
import type { CardResponse } from "@/types/feed";

/**
 * 실 카드 상세 데이터 훅 — GET /api/cards/{publicId}(인증·소유자 전용).
 *
 * - authenticated 에서만 요청한다. guest·인증 loading/error 중에는 호출하지 않는다
 *   (실 카드는 소유자 전용 → guest 는 CardDetailScreen 이 접근 제한으로 분기하고 API 를 부르지 않는다).
 * - loading / ready / notFound / error + refetch 로 정규화한다. empty·preparing 은 없다
 *   (단건은 존재(ready)하거나 없거나(notFound), API 에 상태 필드가 없음).
 * - 재조회 트리거는 publicId 변경 + refetch 로 한정한다(401·404 등에서 자동·무한 재요청 없음).
 */
export type CardDetailState =
  | { status: "loading" }
  | { status: "ready"; card: CardResponse }
  | { status: "notFound" }
  | { status: "error" };

export function useCardDetail(publicId: string): CardDetailState & { refetch: () => void } {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchCardDetail(publicId, signal),
    [publicId],
  );
  const state = useAsyncData<CardDetailResult>(fetcher, enabled);

  if (state.status === "success") {
    return state.data.status === "ready"
      ? { status: "ready", card: state.data.card, refetch: state.refetch }
      : { status: "notFound", refetch: state.refetch };
  }
  if (state.status === "error") return { status: "error", refetch: state.refetch };
  return { status: "loading", refetch: state.refetch }; // idle · loading → 데이터 로딩
}
