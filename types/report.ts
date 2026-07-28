/**
 * 내 보고서 생성 상태 타입 (홈 [내 보고서] PREPARING 처리중 슬롯용).
 *
 * 본문·상세는 미연결이다 — 추후 service.reports 테이블/API(GET /reports/mine, status 포함)로 교체한다.
 * status 는 기존 보고서 생성 상태 어휘(PREPARING/READY/ERROR)를 따른다(별도 boolean isProcessing 을 만들지 않는다).
 */
export type ReportStatus = "PREPARING" | "READY" | "ERROR";

/**
 * 보고서 생성 유형 — 온디맨드(관심 자료 분석)·데일리(아침 브리핑) 구분용.
 * ⚠ Mock/VM 범위의 화면 구분값이다. 실제 API 계약(백엔드 필드명·값)으로 단정하지 않는다
 *   — service.reports 스키마 확정 시 어댑터에서 매핑한다.
 */
export type ReportKind = "ON_DEMAND" | "DAILY";

/** 내 보고서 1건의 생성 상태 요약. 처리중 여부는 status 로 파생한다(status === "PREPARING"). */
export type MyReport = {
  id: string;
  title: string;
  kind: ReportKind;
  status: ReportStatus;
};
