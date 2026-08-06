import type { Metadata } from "next";

import { SettingsScreen } from "@/components/settings/settings-screen";

export const metadata: Metadata = {
  title: "AlphaCatcher — 설정",
  description: "계정, 화면 모드, 외부 AI용 MCP 연결 키를 관리합니다.",
};

/**
 * 설정 — /settings. member 전용(§15). 라우트 가드 없음(토큰은 localStorage) —
 * 인증 분기·접근 제한은 클라이언트 SettingsScreen 이 담당한다(홈·상세와 동일 패턴).
 */
export default function SettingsPage() {
  return <SettingsScreen />;
}
