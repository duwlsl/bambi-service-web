"use client";

import { useCallback } from "react";

import { useAuth } from "@/components/auth/use-auth";
import type { ErrorCode } from "@/constants/errors";
import type { AsyncErrorState } from "@/hooks/use-async-data";
import { usePolledData } from "@/hooks/use-polled-data";
import { ApiError } from "@/lib/api-client";
import { fetchNotifications } from "@/lib/repositories/notifications";
import type { NotificationListDto } from "@/types/notification";

/** 알림 Inbox 배경 polling 주기. 기존 동작(30초)을 그대로 유지한다. */
const NOTIFICATIONS_POLL_MS = 30_000;

/**
 * 로그인 사용자의 알림 Inbox를 읽고 30초마다 새 완료 알림을 확인한다.
 *
 * **조회 프리미티브를 `useAsyncData` → `usePolledData` 로 이관했다(2026-08-28).**
 * 이전에는 `useAsyncData` + `window.setInterval(refetch, 30_000)` 조합이었는데, 그 훅의
 * `refetch()` 는 내부 reload 카운터를 올려 **status 를 loading 으로 되돌리도록 설계**돼 있다
 * (hooks/use-async-data.ts 상단 주석의 의도 — 사용자가 누르는 재시도용). 배경 polling 에
 * 그대로 쓰니 30초 tick 마다 기존 데이터가 사라져 **unread 배지가 주기적으로 없어졌다 돌아오고**,
 * 드롭다운이 열려 있으면 목록이 "알림을 불러오는 중…" 으로 되돌아갔다.
 * `hooks/use-polled-data.ts` 는 정확히 이 문제를 위해 만들어졌지만(파일 상단 주석이 이 훅을
 * 지목하고 있다) 정작 알림은 이관되지 않은 채 남아 있었다.
 *
 * 이관으로 함께 얻는 것(전부 usePolledData 가 이미 구현한 동작 — 그 파일은 수정하지 않았다):
 * - **stale-while-revalidate**: 최초 로드만 loading, 이후 재조회는 기존 목록·unreadCount 를 유지한 채
 *   `isRevalidating` 으로만 표시한다.
 * - **숨김 탭 정지**: `document.hidden` 이면 다음 tick 을 걸지 않고, visible 복귀 시 즉시 1회
 *   재조회한 뒤 주기를 재개한다. 기존 `setInterval` 은 백그라운드 탭에서도 계속 돌았다.
 * - **중복 요청 차단**: 진행 중인 요청이 있으면 다음 tick·수동 refetch 를 건너뛴다. 다음 타이머도
 *   현재 요청이 settle 된 뒤에 걸리므로 느린 응답에서 요청이 겹치지 않는다.
 * - **정리**: 언마운트·비활성화(로그아웃) 시 타이머 해제, visibilitychange 리스너 제거,
 *   진행 중 요청 AbortController 취소.
 * - **실패해도 기존 데이터 유지**: 성공 이력이 있는 뒤의 배경 조회 실패는 목록을 지우지 않는다.
 *
 * ⚠️ 수동 refetch 는 진행 중인 요청이 있으면 **건너뛴다**(usePolledData 의 in-flight 락).
 * 이전 구현은 진행 중 요청을 취소하고 새로 시작했다. 실사용 경로에는 영향이 없다 —
 * `useNotificationOpen` 의 `onReadConfirmed` 는 항상 화면 이동과 함께 일어나 새 인스턴스가
 * 처음부터 조회하고, 드롭다운 열기의 refetch 는 그 순간 진행 중이던 응답이 곧바로 목록을 채운다.
 *
 * 반환 계약은 이전과 동일한 판별 union 이다(status + data/errorCode + refetch) — 소비 컴포넌트
 * (헤더 드롭다운·`/notifications` 화면)는 수정하지 않는다. `isRevalidating` 만 추가되며,
 * 현재 화면들은 이 값을 쓰지 않는다(배경 갱신을 UI 로 알리지 않는 기존 동작 유지).
 */
export type NotificationsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: NotificationListDto; isRevalidating: boolean }
  | AsyncErrorState;

export type NotificationsApi = NotificationsState & { refetch: () => Promise<void> };

export function useNotifications(): NotificationsApi {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const fetcher = useCallback((signal: AbortSignal) => fetchNotifications(signal), []);
  const state = usePolledData<NotificationListDto>(fetcher, enabled, NOTIFICATIONS_POLL_MS);
  const refetch = state.refetch;

  // data 를 함께 확인한다 — 공개 status 타입상 data 는 optional 이라, 값이 없으면 성공으로
  // 확정하지 않고 loading 으로 둔다(useWikiBuildStatus 와 같은 방어).
  if (state.status === "success" && state.data !== undefined) {
    return { status: "success", data: state.data, isRevalidating: state.isRevalidating, refetch };
  }
  // 최초 조회 실패만 여기로 온다(성공 이력이 있으면 위 success 분기가 기존 데이터를 유지한다).
  // 원인 코드는 이전 구현(useAsyncData)과 동일한 규칙으로 보존해 화면이 코드별 문구를 고른다(§4).
  if (state.status === "error") return { status: "error", errorCode: toErrorCode(state.error), refetch };
  if (state.status === "idle") return { status: "idle", refetch };
  return { status: "loading", refetch };
}

/**
 * ApiError.code 는 공통 client 가 이미 정규화한 값이다(미상 코드 → INTERNAL_ERROR).
 * ApiError 가 아니면(네트워크 단절·JSON 파싱 실패 등) 코드가 없으므로 undefined 로 둔다 —
 * 소비 측은 `resolveErrorMessage` 의 fallback 에 맡긴다(hooks/use-async-data.ts 와 같은 규칙).
 */
function toErrorCode(error: unknown): ErrorCode | undefined {
  return error instanceof ApiError ? error.code : undefined;
}
