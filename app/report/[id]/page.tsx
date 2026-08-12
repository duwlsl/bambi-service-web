import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CardDetailScreen } from "@/components/report/card-detail-screen";
import { ReportScreen } from "@/components/report/report-screen";
import { reportRouteExists } from "@/lib/mock/report";
import {
  parseReportOrigin,
  REPORT_ORIGIN_ID_PARAM,
  REPORT_ORIGIN_PARAM,
} from "@/lib/report-origin";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AlphaCatcher — 콘텐츠 상세",
  description: "출처 기반 카드 브리핑 상세.",
};

/**
 * 카드(리포트) 상세 — /report/[id]. 서버는 **id 종류만** 판정한다(인증 API 호출 없음 — 토큰은 localStorage).
 *
 * 1) 등록된 mock id(REPORT_REGISTRY, post-* · today) → 기존 mock 상세 ReportScreen (회귀 유지)
 * 2) 정상 UUID 형식 → 실 카드 상세 CardDetailScreen (클라이언트에서 인증 후 GET /api/cards/{publicId})
 * 3) 비-UUID 미등록 id(/report/unknown 등) → notFound() (기존 HTTP 404 유지)
 *
 * 404 한계: 정상 형식이지만 존재하지 않는 UUID 는 서버가 (localStorage 토큰·소유자 스코프라) 존재를
 * 확인할 수 없어 여기서 걸러내지 못한다 → CardDetailScreen 이 렌더된 뒤 클라이언트 API 404 로
 * 화면 내부 Not Found 를 표시한다(HTTP 응답 자체는 200). 잘못된 UUID 형식은 아래 3)으로 실제 404.
 *
 * 뒤로가기 출처(2026-08-12): `?from=` 을 **서버에서** 허용 토큰으로 좁혀 상세에 넘긴다
 * (lib/report-origin.ts). 클라이언트 히스토리·referrer 추측이 아니라 URL 값이라
 * 새로고침·직접 진입·북마크에서도 문구와 목적지가 그대로 유지된다.
 */
export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;

  if (reportRouteExists(id)) return <ReportScreen id={id} />;
  if (isUuid(id)) {
    // 허용 토큰만 통과하고, 없거나 알 수 없는 값은 기본 목적지(홈 피드)로 접힌다.
    // 프로필 출처만 대상 UUID(`fromId`)를 함께 받으며, 그것도 형식 검증을 통과해야 쓰인다.
    const query = await searchParams;
    const origin = parseReportOrigin(query[REPORT_ORIGIN_PARAM], query[REPORT_ORIGIN_ID_PARAM]);
    return <CardDetailScreen publicId={id} origin={origin} />;
  }
  notFound();
}
