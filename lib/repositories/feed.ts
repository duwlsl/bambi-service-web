import { apiGet } from "@/lib/api-client";
import { MOCK_POSTS, type FeedPost } from "@/lib/mock/feed";
import type { CardResponse } from "@/types/feed";

/**
 * 피드 데이터 repository — 화면 훅과 데이터 소스 사이의 단일 seam.
 *
 * ★★ 실제 API 교체 지점 ★★
 * 지금은 동기 mock 배열을 Promise 로 감싸 반환한다(동기 mock → 비동기 계층 승격).
 * 홈 피드/내 보고서 API는 미확정(영현 도메인 착수 전, CLAUDE.md §2·§15) — 경로·스키마 추측 금지.
 * 계약 확정 시 이 파일의 본문만 apiGet 호출로 교체한다(훅·컴포넌트 무변경):
 *   export const fetchRecFeed = (signal?: AbortSignal) =>
 *     apiGet<FeedPost[]>("/api/<확정경로>", { signal });
 * 그 시점에 lib/mock/feed.ts 의 데이터는 삭제하고, 필요한 타입은 types/ 로 이관한다.
 * (실제 계약에 따라 페이지네이션 등으로 반환 타입이 일부 조정될 수 있다.)
 */

/** mock 값을 Promise 로 감싸되 AbortSignal 을 존중한다(실 API 의 취소 계약을 미리 반영). */
function resolveAbortable<T>(value: T, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return Promise.resolve(value);
}

/** [피드] 탭(guest) — 공개 추천 피드(mock). 비로그인 홈에서만 쓴다. 빈 배열이면 훅이 empty 로 정규화한다. */
export function fetchRecFeed(signal?: AbortSignal): Promise<FeedPost[]> {
  return resolveAbortable(MOCK_POSTS, signal);
}

/**
 * [피드] 탭(member) — 로그인 사용자의 카드 피드. GET /api/feed(인증, 최신순).
 * guest 피드는 위 mock 을 유지하고, member 피드만 이 함수로 실 API 를 쓴다(useMemberFeed 가 소비).
 * 빈 배열(신규 계정 등)이면 훅이 empty 로 정규화한다.
 */
export function fetchMemberFeed(signal?: AbortSignal): Promise<CardResponse[]> {
  return apiGet<CardResponse[]>("/api/feed", { signal });
}
