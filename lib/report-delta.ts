import type { ReportResponse } from "@/types/report";

/**
 * 이 보고서 본문을 변경점(Delta) 폼으로 렌더할지 — **판정 단일 소스**.
 *
 * 기준은 그 보고서 응답의 `changeHistoryEnabled`(service-api #92, `GET /api/reports/{publicId}`)
 * 하나뿐이다. `lib/report-type.ts` 가 reportType 판정을 한 곳에 모으는 것과 같은 규율이다.
 *
 * ⚠️ **계정 설정(`GET /api/auth/me` · `types/settings.ts` 의 changeHistoryEnabled)을 쓰지 않는다.**
 * 저쪽은 "앞으로 생성할 때 델타 경로를 쓸지"이고 이쪽은 "이미 저장된 이 본문이 어떤 폼인지"라
 * 값이 서로 다르다. 설정으로 분기하면 (1) 사용자가 설정을 끈 순간 과거 델타 리포트가 전부
 * 자유 형식으로 잘못 렌더되고 (2) 설정이 없는 게스트에게 같은 보고서가 다르게 보인다.
 * 보고서 응답이 같으면 로그인 여부와 무관하게 항상 같은 화면이어야 한다.
 *
 * 판정은 **`true` 일 때만 델타**다(엄격 비교). 필드가 없던 배포본·기존 리포트(undefined)와
 * `null`·문자열 `"true"` 같은 계약 밖 값은 전부 기존 자유 형식으로 다룬다 — 백엔드도 미도착
 * 스냅샷을 false 로 저장하므로(V26 DEFAULT FALSE) 같은 기준이다. 본문 헤더 문자열("이번에
 * 달라진 점" 등)을 파싱해 폼을 추측하지 않는다(계약이 명시적으로 금지한다).
 */
export function isDeltaReport(report: Pick<ReportResponse, "changeHistoryEnabled"> | null | undefined): boolean {
  return report?.changeHistoryEnabled === true;
}
