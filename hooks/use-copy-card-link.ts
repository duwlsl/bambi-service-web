"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 안내 문구 노출 시간(ms) — mock 상세(report-screen.tsx)의 복사 토스트와 같은 길이. */
const FEEDBACK_MS = 2500;

export type CopyLinkFeedback = { tone: "ok" | "error"; message: string };

/**
 * 앱 내부 링크 복사 — 카드 공유(`useCopyCardLink`)와 프로필 공유가 같은 동작·문구·타이밍을 쓴다.
 *
 * - 링크는 **현재 origin 기준 canonical URL** 이다: `{origin}{path}`. 호출부가 경로만 넘기고
 *   불필요한 query·hash 를 붙이지 않는다. `window` 접근은 클릭 시점(이벤트 콜백)에만 해서
 *   SSR 렌더와 무관하다.
 * - Clipboard API(`navigator.clipboard.writeText`)만 쓴다. 새 clipboard 라이브러리는 넣지 않고,
 *   미지원·권한 거부는 실패 문구로 알린다(조용히 성공한 척하지 않는다).
 * - 복사는 **읽기 동작**이라 서버 상태를 바꾸지 않는다(요청 자체가 나가지 않는다).
 * - 성공/실패 문구는 호출부가 live region 으로 읽어 스크린리더에도 전달한다.
 *
 * 공유 대상이 늘어도 토스트·타이머·문구를 다시 만들지 않는다 — 경로만 다르게 넘긴다.
 */
export function useCopyLink(path: string): {
  copy: () => void;
  feedback: CopyLinkFeedback | null;
} {
  const [feedback, setFeedback] = useState<CopyLinkFeedback | null>(null);
  const timer = useRef<number | null>(null);

  // 언마운트(모달 닫기·상세 이탈) 시 남은 타이머만 정리한다 — effect 에서 setState 하지 않는다.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const announce = useCallback((next: CopyLinkFeedback) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setFeedback(next);
    timer.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }, []);

  const copy = useCallback(() => {
    const url = `${window.location.origin}${path}`;
    // async 함수로 감싸 **동기 throw(비보안 컨텍스트에서 clipboard 미제공)도 rejection 으로** 받는다.
    const write = async () => navigator.clipboard.writeText(url);
    void write()
      .then(() => announce({ tone: "ok", message: "링크를 복사했습니다." }))
      .catch(() => announce({ tone: "error", message: "링크를 복사하지 못했어요" }));
  }, [announce, path]);

  return { copy, feedback };
}

/**
 * 카드 공개 링크 복사 — 카드 상세의 공유 액션(readbar 버튼 · 공유 모달)과 피드 카드 `⋯` 메뉴가 쓴다.
 * 카드 `publicId` 만 쓴다(`reportId`·내부 id 금지).
 */
export function useCopyCardLink(publicId: string): {
  copy: () => void;
  feedback: CopyLinkFeedback | null;
} {
  return useCopyLink(`/report/${encodeURIComponent(publicId)}`);
}
