import type { Metadata } from "next";

import { WikiScreen } from "@/components/wiki/wiki-screen";

export const metadata: Metadata = {
  title: "AlphaCatcher — 관심사 · LLM Wiki",
  description: "AI가 이해한 내 관심사와 그 근거가 된 자료.",
};

/**
 * 관심사 · LLM Wiki — /wiki. member 전용(§15). 라우트 가드 없음(토큰은 localStorage) —
 * 인증 분기·접근 제한은 클라이언트 WikiScreen 이 담당한다(홈·상세와 동일 패턴).
 * 관심사 데이터는 Service API를 사용하고, 하단 진입 카드에서 `/wiki/graph` 사용자용 LLM Wiki로 이동한다.
 */
export default function WikiPage() {
  return <WikiScreen />;
}
