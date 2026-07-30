import type { Metadata } from "next";

import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";

export const metadata: Metadata = {
  title: "AlphaCatcher — 관심사 설정",
  description: "관심사를 선택하면 필요한 소식을 더 정확하게 골라드려요.",
};

/**
 * 관심사 온보딩 — /onboarding. 신규 가입 자동 로그인 성공 직후 진입(signup-form).
 * member 전용. 라우트 가드·middleware 없음(토큰은 localStorage) — 인증 분기·접근 제한은
 * 클라이언트 OnboardingScreen 이 담당한다(설정·홈과 동일 패턴).
 */
export default function OnboardingPage() {
  return <OnboardingScreen />;
}
