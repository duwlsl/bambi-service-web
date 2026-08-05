"use client";

import { useCallback, useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { toFeedCardVM } from "@/lib/adapters/card";
import { fetchMemberFeed } from "@/lib/repositories/feed";
import type { CardVisibility, FeedCardVM } from "@/types/feed";

/**
 * [내 보고서] 탭(member) 데이터 훅 — GET /api/feed(인증).
 *
 * - authenticated 에서만 요청한다. guest 는 /api/feed 를 호출하지 않고, 인증 loading/error
 *   중에도 요청하지 않는다(usePublicFeed 와 동일한 상태-분리 원칙 — enabled 조건만 다르다).
 * - CardResponse[] → FeedCardVM[] 로 변환한다(어댑터). loading / success / empty / error + refetch 정규화.
 * - refetch 는 상위(HomeView)가 소유해 저장 성공 시 재조회에 재사용한다(§4).
 *
 * **공개 범위 변경 반영**: `applyVisibility` 는 PATCH 성공 응답의 visibility 를 이 훅이 들고 있는
 * 목록에 덮어쓴다. 홈은 이 상태 하나를 [내 보고서] 카드와 우측 rail 이 공유하므로 카드와 rail 의
 * 건수가 어긋날 수 없다. 목록 전체를 다시 받지 않으므로 추가 `GET /api/feed` 도, refetch 로 인한
 * 스켈레톤 깜빡임도 없다.
 *
 * override 는 **서버 데이터가 새로 도착하면 자동 폐기**된다(저장한 원본 참조와 현재 참조를 비교) —
 * effect 에서 초기화하지 않아 set-state-in-effect 를 피하고, useAsyncData 의 cleanup·StrictMode
 * 동작은 그대로 둔다.
 */
export type MemberFeedState =
  | { status: "loading" }
  | { status: "success"; data: FeedCardVM[] }
  | { status: "empty" }
  | { status: "error" };

export type MemberFeedApi = MemberFeedState & {
  refetch: () => void;
  /** PATCH 성공 응답의 확정 visibility 를 공유 목록에 반영한다. */
  applyVisibility: (publicId: string, visibility: CardVisibility) => void;
};

type VisibilityOverrides = {
  /** override 가 얹힌 서버 데이터 참조. 새 응답이 오면 참조가 달라져 override 를 버린다. */
  source: readonly FeedCardVM[] | null;
  map: ReadonlyMap<string, CardVisibility>;
};

const EMPTY_OVERRIDES: VisibilityOverrides = { source: null, map: new Map() };

export function useMemberFeed(): MemberFeedApi {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const fetcher = useCallback(async (signal: AbortSignal): Promise<FeedCardVM[]> => {
    const cards = await fetchMemberFeed(signal);
    return cards.map(toFeedCardVM);
  }, []);
  const state = useAsyncData<FeedCardVM[]>(fetcher, enabled);
  const serverData = state.status === "success" ? state.data : null;

  const [stored, setStored] = useState<VisibilityOverrides>(EMPTY_OVERRIDES);
  const overrides = stored.source === serverData ? stored.map : EMPTY_OVERRIDES.map;

  const applyVisibility = useCallback(
    (publicId: string, visibility: CardVisibility) => {
      setStored((prev) => {
        const base = prev.source === serverData ? prev.map : EMPTY_OVERRIDES.map;
        return { source: serverData, map: new Map(base).set(publicId, visibility) };
      });
    },
    [serverData],
  );

  const common = { refetch: state.refetch, applyVisibility };

  if (state.status === "error") return { status: "error", ...common };
  if (serverData === null) return { status: "loading", ...common }; // idle · loading → 데이터 로딩
  if (serverData.length === 0) return { status: "empty", ...common };

  const data =
    overrides.size === 0
      ? serverData
      : serverData.map((card) => {
          const next = overrides.get(card.publicId);
          return next === undefined || next === card.visibility ? card : { ...card, visibility: next };
        });

  return { status: "success", data, ...common };
}
