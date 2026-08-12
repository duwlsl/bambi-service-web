import type { ReportType } from "@/types/report";

/**
 * 보고서 생성 종류(reportType) 판정·문구 매핑 — **단일 소스**.
 *
 * `constants/errors.ts` 가 에러코드 문구를 한 곳에 모으는 것과 같은 규율이다. 화면마다
 * `reportType === "ON_DEMAND"` 조건문과 라벨 문자열을 다시 쓰지 않는다.
 *
 * 두 함수 모두 입력이 `unknown` 이다. 타입상으로는 `ReportType | null` 이 오게 돼 있지만
 * 이 값은 **아직 배포되지 않은 서버 필드**라서, 실제로는 필드 누락(undefined)·null·빈 문자열·
 * 계약에 없는 문자열이 모두 도달할 수 있다. 역직렬화 결과를 그대로 믿지 않고 여기서 한 번
 * 좁힌다 — 그래야 알 수 없는 값이 화면에 원문으로 새거나 런타임 오류가 되지 않는다.
 */
const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  MORNING_BRIEFING: "아침 브리핑",
  ON_DEMAND: "수동 생성",
  // API 식별값은 ONBOARDING 이지만 사용자에게는 "첫 리포트"로만 보인다(원문 노출 금지).
  ONBOARDING: "첫 리포트",
  WIKI_INTEREST: "Wiki 관심사",
};

/** 알려진 reportType 이면 그 값을, 아니면 null. 모르는 값을 한쪽으로 단정하지 않는다. */
export function toReportType(value: unknown): ReportType | null {
  return typeof value === "string" && Object.hasOwn(REPORT_TYPE_LABEL, value)
    ? (value as ReportType)
    : null;
}

/**
 * 화면 표시 문구. 알 수 없는 값·없는 값은 **null** 이고, 호출부는 그때 아무것도 렌더하지 않는다.
 * `UNKNOWN` 같은 임시 배지를 만들거나 API 원문 값을 그대로 노출하지 않는다.
 */
export function getReportTypeLabel(value: unknown): string | null {
  const type = toReportType(value);
  return type === null ? null : REPORT_TYPE_LABEL[type];
}

/**
 * 아침 브리핑인지 — **공개 전환을 막는 유일한 판정 근거**다.
 *
 * 판정은 서버 계약값 `reportType === "MORNING_BRIEFING"` 하나로만 한다
 * (service-api `CardResponse.reportType`, 발행 시점에 카드에 복제 저장돼 모든 응답 경로에
 * 채워진다). 제목 문자열(`오늘의 관심사 브리핑`)·생성 시각·공개 여부로 추정하지 않는다 —
 * 제목은 agent 가 만드는 자유 문자열이라 언제든 바뀌고, 온디맨드도 같은 제목을 가질 수 있다.
 *
 * **알 수 없는 값은 아침 브리핑이 아니다.** `toReportType` 이 null 로 좁히는 경우
 * (필드 누락·null·계약 밖 문자열)까지 차단하면, 이 필드가 없던 배포본에서 발행된 기존
 * 카드와 온디맨드·Wiki 관심사 보고서의 공개 전환이 통째로 막힌다. 확실히 아침 브리핑일
 * 때만 막고, 그 외에는 기존 동작을 그대로 둔다.
 *
 * ⚠️ 이건 **프론트 UX 가드**다. Service API `PATCH /api/cards/{publicId}/visibility` 는
 * 소유권만 검사하고 종류를 보지 않으므로(CardService.changeVisibility 실측 2026-08-11),
 * 직접 호출은 여전히 통과한다 — 서버 가드가 별도로 필요하다.
 */
export function isMorningBriefing(value: unknown): boolean {
  return toReportType(value) === "MORNING_BRIEFING";
}
