import { MOCK_MY_REPORTS } from "@/lib/mock/my-reports";
import type { MyReport } from "@/types/report";

/**
 * 내 보고서 생성 상태 repository — 화면 훅과 데이터 소스 사이의 단일 seam.
 *
 * ★★ 실제 API 교체 지점 ★★
 * 지금은 mock 을 Promise 로 감싸 반환한다. service.reports 테이블/API 가 준비되면 이 본문만
 * apiGet<...>("<GET /reports/mine 확정 경로>", { signal }) 호출 + 어댑터로 교체한다(훅·컴포넌트 무변경).
 * 경로는 미확정이라 하드코딩하지 않는다.
 */

/** mock 값을 Promise 로 감싸되 AbortSignal 을 존중한다(실 API 취소 계약 선반영). */
function resolveAbortable<T>(value: T, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return Promise.resolve(value);
}

/** 내 보고서 생성 상태 목록(mock). PREPARING 필터는 훅/화면 계층에서 status 로 파생한다. */
export function fetchMyReports(signal?: AbortSignal): Promise<MyReport[]> {
  return resolveAbortable(MOCK_MY_REPORTS, signal);
}
