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
 * ⚠ **기본값은 빈 배열이다(슬롯 미노출).** 이 화면은 실제 카드(GET /api/feed)와 같은 리스트를 쓰기 때문에,
 *   mock 이 PREPARING 을 항상 반환하면 **배포 서버에서 실 카드 옆에 가짜 처리중 카드가 영구 노출된다.**
 *   실 API(GET /reports/mine) 연결 전까지 기본값을 채우지 않는다.
 *
 * QA 두 경우:
 *  - PREPARING 없음 → 슬롯 미노출 (현재 기본값 = 배포 상태).
 *  - PREPARING 있음 → 아래 QA_PREPARING_SAMPLES 를 배열에 넣어 확인하고, **확인 후 반드시 빈 배열로 원복**한다.
 */
export const MOCK_MY_REPORTS: MyReport[] = [];

/** 슬롯 렌더 확인용 샘플 — 위 배열에 임시로 넣어 쓰고 커밋하지 않는다. */
export const QA_PREPARING_SAMPLES: MyReport[] = [
  { id: "rep-job-ondemand", kind: "ON_DEMAND", title: "관심 자료 분석 보고서", status: "PREPARING" },
  { id: "rep-job-daily", kind: "DAILY", title: "오늘의 아침 브리핑", status: "PREPARING" },
];
