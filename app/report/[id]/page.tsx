import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportScreen } from "@/components/report/report-screen";
import { reportRouteExists } from "@/lib/mock/report";

export const metadata: Metadata = {
  title: "AlphaCatcher — 콘텐츠 상세",
  description: "출처 기반 카드 브리핑 상세.",
};

/**
 * 카드(리포트) 상세 (P0-4) — /report/[id].
 *
 * 경로 종류(lib/mock/report.ts 레지스트리):
 * - public("post-fx-trigger" 등): 고유 공개 URL. guest·member 가 동일하게 본다(차이는 인증 액션 실행뿐).
 * - personal("today"): 로그인 사용자 개인 경로. guest 는 접근 제한(본문 미노출). → allowGuest=false.
 * - 미등록 id("abc" 등): 서버에서 notFound() → app/not-found.tsx (HTTP 404 유지).
 *
 * 서버는 등록 여부만 확인해 404 를 유지하고, 등록된 id 의 데이터 상태
 * (loading / ready / preparing / error / refetch)는 클라이언트 훅(useReportDetail)이 담당한다.
 *
 * TODO(실 API 연동): 지금은 mock 레지스트리로 존재만 확인한다(토큰이 localStorage 라 서버가 인증을 모름).
 *   실 API 에서는 서버가 요청자와 대상 보고서를 조회해 소유권·visibility 로 인가하고 404 전략을
 *   재설계한다 — private 본문이 비소유자에게 전송(직렬화)되지 않도록 서버에서 차단한다.
 */
export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!reportRouteExists(id)) notFound();

  // 등록된 id — 데이터 상태는 ReportScreen 이 인증 상태와 함께 클라이언트에서 분기한다.
  return <ReportScreen id={id} />;
}
