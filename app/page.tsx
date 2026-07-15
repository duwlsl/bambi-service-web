import type { Metadata } from "next";

import { HomeScreen } from "@/components/home/home-screen";

export const metadata: Metadata = {
  title: "AlphaCatcher — 홈",
  description: "관심사 기반 카드 브리핑 피드.",
};

/**
 * 홈(P0-3) — [내 보고서]/[피드] 탭 전환.
 * 라우트 가드 없음(A안): 토큰 유무와 무관하게 노출. 보호 라우트·게스트 상태(비로그인
 * nav·가입 유도 모달 #guest-modal)는 P1.
 * 데이터는 전부 mock(lib/mock/feed.ts) — 실제 API 교체 지점 주석 참조.
 */
export default function HomePage() {
  return <HomeScreen />;
}
