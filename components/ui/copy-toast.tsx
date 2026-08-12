"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import type { CopyLinkFeedback } from "@/hooks/use-copy-card-link";

/** 토스트 우측의 되돌리기 등 후속 액션 — 없으면(대부분) 문구만 있는 토스트다. */
export type ToastAction = { label: string; onAction: () => void };

/** 스택 컨테이너 DOM id — 화면에 하나만 존재한다(호출부 수와 무관). */
const STACK_ID = "bambi-toast-stack";

/**
 * 스택 컨테이너 클래스 — 화면 **하단 중앙**(bottom 28px, 기존 위치 그대로).
 *
 * `inset-x-4` 로 좌우 16px 을 비워 두고 그 안에서 `items-center` 로 가운데 정렬한다. 폭을 vw 계산
 * 으로 잡지 않는 이유: `100vw` 는 세로 스크롤바 폭을 포함해 데스크톱에서 몇 px 씩 넘칠 수 있다.
 * left/right 를 직접 띄우면 어떤 화면에서도 좌우 여백이 16px 아래로 내려가지 않는다.
 *
 * 컨테이너는 화면 하단을 가로지르지만 `pointer-events-none` 이라 빈 자리는 클릭을 가로채지 않고,
 * 토스트 카드만 `pointer-events-auto` 로 되살린다(되돌리기 버튼이 눌려야 한다).
 */
const STACK_CLASS =
  "pointer-events-none fixed inset-x-4 bottom-7 z-[300] flex flex-col items-center gap-2";

/**
 * 표시 순서 카운터 — 값 자체에 의미는 없고 **대소 관계만** 쓴다(나중에 뜬 토스트가 더 큰 값).
 * 화면에 뜬 토스트가 0개가 되어도 되돌리지 않는다 — 되돌리면 남은 토스트와 순서가 뒤엉킨다.
 */
let sequence = 0;
const nextSequence = () => (sequence += 1);

/**
 * 스택 컨테이너를 찾거나 만든다. **idempotent** 라 StrictMode 이중 렌더에서도 하나만 생긴다.
 * 토스트가 실제로 뜰 때만(= `feedback !== null`, 클릭 이후) 불리므로 SSR·hydration 경로에는
 * 이 함수가 아예 닿지 않는다(기존 `document.body` 접근과 같은 조건).
 */
function stackRoot(): HTMLElement {
  const existing = document.getElementById(STACK_ID);
  if (existing !== null) return existing;
  const created = document.createElement("div");
  created.id = STACK_ID;
  created.className = STACK_CLASS;
  document.body.appendChild(created);
  return created;
}

/**
 * 앱 공통 결과 토스트 — 링크 복사(카드 `⋯` 메뉴 · 상세 · 프로필)와 보고서 공개 범위 변경이
 * **이 한 컴포넌트**를 같이 쓴다. 화면마다 토스트를 새로 만들지 않는다.
 *
 * ## 여러 토스트가 겹치던 문제 (2026-08-13 검수)
 *
 * 예전에는 인스턴스마다 `position: fixed` 카드를 `document.body` 에 직접 띄웠다. 호출부가 서로를
 * 모르니 좌표가 같았고, 공개 전환 성공 토스트가 살아 있는 2.5초 안에 `링크 복사` 를 누르면 두 장이
 * 정확히 포개졌다 — 뒤 토스트의 `되돌리기` 버튼까지 덮였다.
 *
 * 지금은 **모든 토스트가 공유 스택 컨테이너 한 곳에 portal 된다.** 세로 flex + `gap-2`(8px)라
 * 겹칠 수가 없고, 문구 길이·action 유무로 높이가 달라도 브라우저가 알아서 밀어낸다. 호출부는
 * 예전과 똑같이 `<CopyToast feedback={...} />` 만 그리면 된다 — **bottom offset 을 호출부가
 * 계산하지 않는다**(그 방식은 호출부가 늘 때마다 어긋난다).
 *
 * 순서는 flex `order` 로 못 박는다: 뜬 순서대로 번호를 받아 **최신이 가장 아래**, 이전 것들이 위로
 * 쌓인다. portal 삽입 순서(DOM 순서)에 기대지 않는 이유는, 서로 다른 호출부의 portal 이 한 컨테이너에
 * 붙는 순서까지 React 가 보장한다고 볼 근거가 없어서다. 중간 토스트가 자기 시간에 사라져도 남은
 * 것들의 상대 순서는 그대로다(각자 수명은 호출부가 따로 관리한다).
 *
 * **표면은 제품의 카드 언어를 쓴다**: `bg-card` + `border-border` + `rounded-lg` + 팝오버와 같은
 * 그림자(`0 10px 30px rgba(10,12,15,.14)` — `post-more-menu.tsx` 와 같은 값). 새 색·새 그림자를
 * 만들지 않는다. 큰 알약·원형 체크 배지·이모지는 두지 않고 결과 문구만 남긴다.
 *
 * **성공/실패를 색으로만 구분하지 않는다.** 배지가 없어도 판별 근거는 문구 자체다
 * ("링크를 복사했습니다." vs "…하지 못했어요") — 실패는 `text-destructive` 로 한 번 더 갈릴 뿐,
 * 색을 못 봐도 뜻이 그대로 전달된다.
 *
 * **접근성**: 문구 span 이 `aria-hidden` 이다. 스크린리더 낭독은 호출부가 이미 들고 있는 상시
 * live region(`role="status"`)이 그대로 담당한다 — 토스트가 뜰 때 DOM 에 함께 삽입되는 live
 * region 은 낭독이 보장되지 않고, 둘 다 노출하면 같은 문구를 두 번 읽는다. 토스트가 여러 장이어도
 * 낭독 주체는 각 호출부의 live region 하나씩이라 중복 낭독이 늘지 않는다. `action` 버튼은
 * **초점을 받는 요소**라 aria-hidden 안에 두지 않는다(숨김 범위를 문구 span 으로 좁힌 이유).
 *
 * 표시 시간·문구·액션은 호출부가 정한다. 이 컴포넌트는 받은 것을 그리기만 한다.
 * 실패(`tone === "error"`)도 같은 자리에서 알린다 — 조용히 성공한 척하지 않는다.
 */
export function CopyToast({
  feedback,
  action = null,
}: {
  feedback: CopyLinkFeedback | null;
  /** 문구 오른쪽 액션(예: `되돌리기`). 없으면 문구만 있는 기존 토스트 그대로다. */
  action?: ToastAction | null;
}) {
  if (feedback === null) return null;

  return createPortal(<ToastCard feedback={feedback} action={action} />, stackRoot());
}

/**
 * 토스트 한 장. **떠 있는 동안만 mount 되는 경계**라서 여기서 표시 순서를 받는다 —
 * `CopyToast` 는 호출부와 함께 계속 mount 돼 있어(feedback 이 null 이면 early return) 그쪽에서
 * 번호를 받으면 "토스트가 뜬 순서"가 아니라 "호출부가 그려진 순서"가 되어 버린다.
 */
function ToastCard({
  feedback,
  action,
}: {
  feedback: CopyLinkFeedback;
  action: ToastAction | null;
}) {
  // 뜰 때 한 번만 받는다. 같은 자리에서 문구만 바뀌는 경우(연속 변경)에는 자리를 지킨다.
  const [order] = useState(nextSequence);

  return (
    <div
      style={{ order }}
      className="pointer-events-auto flex max-w-full items-center gap-3 rounded-lg border border-border bg-card py-2.5 pr-2.5 pl-3.5 shadow-[0_10px_30px_rgba(10,12,15,.14)]"
    >
      <span
        aria-hidden="true"
        className={`min-w-0 text-[13px] leading-5 font-semibold ${
          feedback.tone === "ok" ? "text-foreground" : "text-destructive"
        }`}
      >
        {feedback.message}
      </span>
      {action !== null && (
        <button
          type="button"
          onClick={action.onAction}
          className="focus-ring shrink-0 rounded-md px-2 py-1 text-[12.5px] font-bold whitespace-nowrap text-signal-ink hover:bg-background"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
