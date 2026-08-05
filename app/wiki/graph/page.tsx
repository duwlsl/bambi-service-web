import type { Metadata } from "next";
import { Suspense } from "react";

import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { LlmWikiScreen } from "@/components/wiki/llm-wiki-screen";

export const metadata: Metadata = {
  title: "AlphaCatcher — 나의 LLM Wiki",
  description: "AI가 정리한 내 지식의 연결과 근거 자료를 확인합니다.",
};

/** 검색 파라미터 기반 Node 선택을 Suspense 경계 안에서 렌더한다. */
export default function LlmWikiPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-[1180px] px-5 py-8" aria-hidden="true">
          <FeedSkeleton />
        </main>
      }
    >
      <LlmWikiScreen />
    </Suspense>
  );
}
