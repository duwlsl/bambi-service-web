import type { MyReport } from "@/types/report";

/**
 * 내 보고서 생성 상태 mock — 홈 [내 보고서] PREPARING 처리중 슬롯 검증용(Mock-first).
 * 컴포넌트/훅은 이 파일을 직접 import 하지 않는다(lib/repositories/my-reports.ts seam 경유).
 * 추후 GET /reports/mine(status 포함) 실 응답으로 교체한다.
 *
 * 정기 생성 또는 온디맨드 생성으로 시작된 "생성 중" 보고서만 담는다
 * (READY 완료 보고서 본문은 GET /api/feed = 내 보고서 카드로 이미 노출됨 — 여기서 중복 생성하지 않는다).
 * status === "PREPARING" 인 항목만 슬롯으로 노출된다(훅에서 status 로 파생).
 *
 * QA 두 경우:
 *  - PREPARING 있음 → 슬롯 노출(현재 기본값).
 *  - PREPARING 없음 → 아래 배열을 비우거나 status 를 바꿔 검증(검증 후 이 기본값으로 정확히 원복).
 */
export const MOCK_MY_REPORTS: MyReport[] = [
  { id: "rep-job-ondemand", kind: "ON_DEMAND", title: "관심 자료 분석 보고서", status: "PREPARING" },
  { id: "rep-job-daily", kind: "DAILY", title: "오늘의 아침 브리핑", status: "PREPARING" },
];
