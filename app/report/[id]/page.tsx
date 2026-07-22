import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportScreen } from "@/components/report/report-screen";
import { loadReport } from "@/lib/mock/report";

export const metadata: Metadata = {
  title: "AlphaCatcher — 콘텐츠 상세",
  description: "출처 기반 카드 브리핑 상세.",
};

/**
 * 카드(리포트) 상세 (P0-4) — /report/[id].
 *
 * 경로 종류(lib/mock/report.ts 레지스트리):
 * - public("post-fx-trigger" 등): 고유 공개 URL. 이 공개 보고서를 guest·member 모두 동일하게 본다.
 *   차이는 인증 액션(보관·공유·댓글) 실행 여부뿐(guest 는 GuestGateModal). → allowGuest=true.
 * - personal("today"): 로그인 사용자 오늘 아침 브리핑(개인 경로). guest 차단. → allowGuest=false.
 * - 미등록 id("abc" 등): notFound() → app/not-found.tsx.
 *
 * 데이터 상태(ready / preparing / error / notFound)는 loadReport(lib/mock/report.ts)가 반환하고,
 * notFound 만 여기서 처리(라우터 바운더리), 나머지 분기는 ReportScreen 이 소비한다.
 *
 * TODO(실 API 연동 — 이 지점 한 곳에서 교체):
 *   지금은 mock 레지스트리로 경로를 해석한다(토큰이 localStorage 라 서버가 인증을 모름).
 *   실 API 에서는 서버가 요청자(현재 사용자)와 대상 보고서를 조회해 소유권·visibility 기준으로
 *   **인가된 데이터만** 반환한다:
 *     - today: 현재 사용자의 오늘 보고서를 소유자에게만 반환. 비로그인/타인은 401·403(→ 접근 제한).
 *     - public URL: visibility=PUBLIC 이면 그 공개 보고서를 인증 무관 반환, PRIVATE 이면 소유자에게만.
 *   → private 본문이 비소유자에게 전송(직렬화)되지 않도록 서버에서 차단한다.
 */
export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const load = loadReport(id);
  if (load.status === "notFound") notFound();

  // ready / preparing / error 는 ReportScreen 이 인증 상태와 함께 분기한다.
  return <ReportScreen load={load} />;
}
