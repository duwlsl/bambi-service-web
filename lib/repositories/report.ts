import { REPORT_REGISTRY, type ReportDetail } from "@/lib/mock/report";

/**
 * 리포트 상세 데이터 repository — 단일 seam.
 *
 * ★★ 실제 API 교체 지점 ★★
 * 서버가 미등록 id 를 404 로 걸러낸 뒤(app/report/[id]/page.tsx → reportRouteExists),
 * 등록된 id 의 데이터만 이 함수가 로드한다. 지금은 레지스트리를 Promise 로 감싼다.
 * 카드 상세 API는 미확정(CLAUDE.md §2·§15) — content_status/visibility 실제 값 추측 금지.
 * 계약 확정 시 이 파일 본문만 교체한다(훅·컴포넌트 무변경, 단 인증 의존성은 조정될 수 있음):
 *   const data = await apiGet<...>(`/api/reports/${id}`, { signal });
 *   // content_status(확정값) → ready|preparing, visibility → allowGuest 매핑
 *   // 404/NOT_FOUND 는 서버 라우팅에서 이미 처리(실 API 시 404 전략 재설계)
 */

/** 등록된 리포트 1건의 로드 결과. 전송 오류는 throw → 훅이 error 로 정규화한다. */
export type ReportResult =
  | { status: "ready"; report: ReportDetail; allowGuest: boolean }
  | { status: "preparing"; allowGuest: boolean };

/** mock 값을 Promise 로 감싸되 AbortSignal 을 존중한다(실 API 의 취소 계약을 미리 반영). */
function resolveAbortable<T>(value: T, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return Promise.resolve(value);
}

/**
 * 등록된 id 의 리포트를 로드한다(mock). preparing 은 실 API content_status 에서만 발생한다.
 * 서버(reportRouteExists)가 미등록 id 를 이미 404 처리하므로 route 는 존재한다.
 */
export function fetchReport(id: string, signal?: AbortSignal): Promise<ReportResult> {
  const route = REPORT_REGISTRY[id];
  // 방어적: 서버 검증을 통과했는데도 없으면 전송 오류에 준해 reject(훅이 error 로 정규화).
  if (!route) return Promise.reject(new Error(`report route missing: ${id}`));
  const result: ReportResult = {
    status: "ready",
    report: route.report,
    allowGuest: route.kind === "public",
  };
  return resolveAbortable(result, signal);
}
