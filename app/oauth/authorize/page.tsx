import type { Metadata } from "next";
import { Suspense } from "react";

import { OAuthAuthorizeScreen } from "@/components/oauth/oauth-authorize-screen";

export const metadata: Metadata = {
  title: "AlphaCatcher — AI 연결 승인",
  description: "Claude 또는 ChatGPT가 내 LLM Wiki를 읽도록 승인합니다.",
};

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={null}>
      <OAuthAuthorizeScreen />
    </Suspense>
  );
}
