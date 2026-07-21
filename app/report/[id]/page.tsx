import type { Metadata } from "next";

import { ReportScreen } from "@/components/report/report-screen";

export const metadata: Metadata = {
  title: "AlphaCatcher — 콘텐츠 상세",
  description: "출처 기반 카드 브리핑 상세.",
};

/**
 * 카드(리포트) 상세 (P0-4) — /report/[id].
 * 라우트 가드 없음(확정): 공개 화면 — 비로그인도 본문 열람 가능 (CLAUDE.md §5·§15 2026-07-21).
 * guest 최소 UI(비로그인 헤더·보관/공유 가입 유도 모달·하단 Sticky 로그인·가입 CTA)는 P0 —
 * 인증 상태 계층(AuthProvider)과 함께 구현 예정. 목업: variants/report-detail-guest.html.
 * 상세 API 미확정 → id 와 무관하게 mock(lib/mock/report.ts) 렌더.
 * 계약 확정 시 id 로 조회하고 Loading/Error/NotFound 상태(§9)를 연결한다.
 */
export default function ReportDetailPage() {
  return <ReportScreen />;
}
