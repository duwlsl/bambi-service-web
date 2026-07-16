import type { Metadata } from "next";

import { ReportScreen } from "@/components/report/report-screen";

export const metadata: Metadata = {
  title: "AlphaCatcher — 콘텐츠 상세",
  description: "출처 기반 카드 브리핑 상세.",
};

/**
 * 카드(리포트) 상세 (P0-4) — /report/[id].
 * 라우트 가드 없음(홈과 동일, A안).
 * 상세 API 미확정 → id 와 무관하게 mock(lib/mock/report.ts) 렌더.
 * 계약 확정 시 id 로 조회하고 Loading/Error/NotFound 상태(§9)를 연결한다.
 */
export default function ReportDetailPage() {
  return <ReportScreen />;
}
