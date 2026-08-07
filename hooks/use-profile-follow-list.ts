"use client";

import { useCallback } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { toFollowUsers } from "@/lib/adapters/profile";
import { fetchFollowList } from "@/lib/repositories/profile";
import type { FollowListKind, FollowUserVM } from "@/types/profile";

/**
 * 팔로워/팔로잉 목록 훅 — 모달의 탭 하나가 쓴다.
 *
 * 공개 프로필·작성자 카드와 **같은 게스트 허용 정책**이다(백엔드 GET permitAll) → 로그인 상태면
 * Bearer 를 붙여 `following` 이 채워지고, 게스트면 무토큰으로 열람한다(따라서 전부 false).
 *
 * `enabled` 는 **한 번 열린 탭은 계속 true 로 두라**는 뜻이다(호출부가 관리한다). `useAsyncData`
 * 는 enabled 가 false→true 로 바뀔 때 다시 조회하므로, 탭을 오갈 때마다 enabled 를 껐다 켜면
 * 같은 API 를 반복 호출하게 된다. 열린 적 없는 탭은 요청하지 않고(모달을 열자마자 두 탭을 다
 * 부르지 않는다), 한 번 연 탭의 데이터는 탭을 오가도 그대로 남는다.
 *
 * 0건은 정상(empty) — "아직 팔로워가 없어요".
 *
 * **페이지네이션은 없다.** 서버가 전체 목록을 한 번에 주므로 여기서도 page 상태를 만들지 않는다
 * (없는 계약을 흉내 낸 `더 보기` 를 만들지 않는다). 목록이 길어지면 모달 본문이 스크롤된다.
 */
export type FollowListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: FollowUserVM[] }
  | { status: "empty" }
  | { status: "error" };

export function useProfileFollowList(
  publicId: string,
  kind: FollowListKind,
  enabled: boolean,
): FollowListState & { refetch: () => void } {
  const { status } = useAuth();
  // 인증 확인이 끝난 뒤에만 요청한다 — 로그인 상태면 Bearer 를 붙여 following 을 채운다.
  const ready = status !== "loading";
  const authed = status === "authenticated";
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchFollowList(publicId, kind, authed, signal).then(toFollowUsers),
    [publicId, kind, authed],
  );
  const state = useAsyncData<FollowUserVM[]>(fetcher, enabled && ready);

  if (state.status === "success") {
    return state.data.length > 0
      ? { status: "success", data: state.data, refetch: state.refetch }
      : { status: "empty", refetch: state.refetch };
  }
  if (state.status === "error") return { status: "error", refetch: state.refetch };
  if (state.status === "idle") return { status: "idle", refetch: state.refetch };
  return { status: "loading", refetch: state.refetch };
}
