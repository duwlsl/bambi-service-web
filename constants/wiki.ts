/**
 * 관심사 · LLM Wiki 화면 문구/분류 매핑 (단일 소스).
 *
 * ⚠ evidence.reasons 코드 값은 Agent/서비스 계약 확정 전(제안)이다.
 *   미상 코드는 fallback 으로 처리한다(constants/errors.ts resolveErrorMessage 패턴).
 *   화면에 원시 코드값을 그대로 노출하지 않는다.
 *
 * documentKind 는 필터·제외 판정에만 쓰고 사용자 UI 로는 노출하지 않기로 했으므로
 * (concept·entity·document 동일 카드 렌더) 한글 라벨 매핑은 두지 않는다.
 */

/** 근거 코드 → 한글 문구. 실제 코드 enum 확정 전 제안값 — 미상 코드는 fallback. */
export const EVIDENCE_REASON_MESSAGES: Record<string, string> = {
  SAVED_FREQUENTLY: "관련 자료를 자주 저장했어요",
  VIEWED_REPEATEDLY: "관련 콘텐츠를 반복해서 열람했어요",
  RECENT_ACTIVITY_UP: "최근 관련 활동이 늘었어요",
  CO_OCCURRENCE: "다른 관심사와 함께 자주 나타나요",
  ONBOARDING_ADDED: "온보딩에서 직접 추가한 주제예요",
};

const FALLBACK_EVIDENCE_MESSAGE = "관련 활동이 감지됐어요";

/** 근거 코드 → 한글 문구. 미상 코드는 fallback 문구로 대체한다. */
export function resolveEvidenceReason(code: string): string {
  return EVIDENCE_REASON_MESSAGES[code] ?? FALLBACK_EVIDENCE_MESSAGE;
}

/** 화면에서 방어적으로 제외하는 문서 종류(service 기본 제외 + 프론트 이중 방어, 07-27 확정). */
export const EXCLUDED_DOCUMENT_KIND = "schema";
