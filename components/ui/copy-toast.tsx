"use client";

import { createPortal } from "react-dom";

import type { CopyLinkFeedback } from "@/hooks/use-copy-card-link";

/**
 * 링크 복사 결과 토스트 — 위치는 목업 `.up-toast`(하단 중앙 고정, bottom 28px)를 따르되
 * **표면은 제품의 카드 언어를 쓴다**: `bg-card` + `border-border` + radius 14 + 부드러운 그림자.
 *
 * 목업의 반전(어두운 pill) 배경은 쓰지 않는다(2026-08-07 UI 검수) — 화면 전체가 흰 카드·연한
 * 테두리·주황 포인트로 이뤄져 있어 검은 알약이 혼자 튀었다. 성공 표시는 관심사 chip·배지와 같은
 * `wash` 원 안의 `signal-ink` 체크로 맞춘다(새 색 없음).
 *
 * **왜 버튼 옆 작은 문구에서 이 토스트로 옮겼나**(2026-08-07 UI 검수): 피드 카드의 복사 결과가
 * 액션바 오른쪽 끝 11.5px 회색 텍스트라 눈이 가지 않아 "복사가 됐는지 안 됐는지" 알기 어려웠다.
 * 확인 버튼이 있는 모달 대신 토스트를 쓴다 — 복사는 되돌릴 일이 없는 읽기 동작이라 매번 확인
 * 클릭을 요구할 이유가 없고, 모달은 다음 카드로 넘어가는 흐름을 끊는다.
 *
 * **접근성**: 이 토스트는 `aria-hidden` 이다. 스크린리더 낭독은 호출부가 이미 들고 있는 상시
 * live region(`role="status"`)이 그대로 담당한다 — 토스트가 뜰 때 DOM 에 함께 삽입되는 live
 * region 은 낭독이 보장되지 않고, 둘 다 노출하면 같은 문구를 두 번 읽는다.
 *
 * 표시 시간·문구는 훅(`useCopyCardLink`)이 정한다. 이 컴포넌트는 `feedback` 을 그리기만 한다.
 * 실패(`tone === "error"`)도 같은 자리에서 알린다 — 조용히 성공한 척하지 않는다.
 *
 * `feedback` 은 클릭 콜백에서만 채워지므로 SSR·hydration 시점에는 항상 null 이고, 그때는 아무것도
 * 렌더하지 않는다 — `document.body` 에 접근하는 경로가 브라우저에서만 열린다(마운트 플래그 불필요.
 * 기존 모달들도 같은 방식이다 — `components/report/card-share-modal.tsx`).
 */
export function CopyToast({ feedback }: { feedback: CopyLinkFeedback | null }) {
  if (feedback === null) return null;

  return createPortal(
    <div
      aria-hidden="true"
      className="fixed bottom-7 left-1/2 z-[300] flex -translate-x-1/2 items-center gap-2.5 rounded-[14px] border border-border bg-card py-3 pr-5 pl-[15px] shadow-[0_16px_40px_rgba(10,12,15,.16)]"
    >
      {/* 결과를 색으로만 구분하지 않는다 — 기호가 문구와 함께 성공/실패를 말한다. */}
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
          feedback.tone === "ok"
            ? "bg-wash text-signal-ink"
            : "bg-background text-destructive"
        }`}
      >
        {feedback.tone === "ok" ? "✓" : "✕"}
      </span>
      <span className="text-[13.5px] font-semibold whitespace-nowrap text-foreground">
        {feedback.message}
      </span>
    </div>,
    document.body,
  );
}
