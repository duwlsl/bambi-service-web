import { MOCK_WIKI_DOCUMENTS, MOCK_WIKI_INTERESTS } from "@/lib/mock/wiki";
import type { WikiDocument, WikiInterest } from "@/types/wiki";

/**
 * 관심사 · LLM Wiki 데이터 repository — 화면 훅과 데이터 소스 사이의 단일 seam.
 *
 * ★★ 실제 API 교체 지점 ★★
 * 지금은 mock 을 Promise 로 감싸 반환한다. 실 경로는 소라/영현 확정 전이므로 하드코딩하지 않는다.
 * (현재 제안: GET /api/wiki/interests · GET /api/wiki/documents — 확정 전까지 경로 미기입).
 * 계약 확정 시 이 파일 본문만 apiGet 호출 + 어댑터로 교체한다(훅·컴포넌트 무변경):
 *   - interests: 응답 최상위 메타(profileId/version/calculatedAt/status)는 무시하고 interests[] → WikiInterest[].
 *   - documents: 전체 조회를 쓴다. documentKind=schema 는 service 가 기본 제외 예정이나 화면도 이중 방어한다
 *     (lib/wiki.ts filterWikiDocuments).
 */

/** mock 값을 Promise 로 감싸되 AbortSignal 을 존중한다(실 API 취소 계약 선반영). */
function resolveAbortable<T>(value: T, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return Promise.resolve(value);
}

/** AI가 이해한 관심사 목록. 빈 배열이면 훅이 empty 로 정규화한다. */
export function fetchWikiInterests(signal?: AbortSignal): Promise<WikiInterest[]> {
  return resolveAbortable(MOCK_WIKI_INTERESTS, signal);
}

/** LLM Wiki 문서 전체 목록(kind 제한 없이 전체). schema 제외/관심사 필터는 화면 계층에서 처리한다. */
export function fetchWikiDocuments(signal?: AbortSignal): Promise<WikiDocument[]> {
  return resolveAbortable(MOCK_WIKI_DOCUMENTS, signal);
}
