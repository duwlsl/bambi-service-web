"use client";

import { useCallback, useRef, useState } from "react";

import { changeCardVisibility } from "@/lib/repositories/card";
import type { CardVisibility } from "@/types/feed";

/**
 * 카드 공개 범위 전환 훅 — 목록 화면에서 **카드별로** 하나씩 쓴다.
 *
 * - 현재 상태의 반대 값으로 PATCH 를 보낸다.
 * - pending 중에는 같은 카드의 추가 요청을 막는다(빠른 연속 클릭 포함). ref 락이라 state 반영을
 *   기다리지 않고 즉시 차단되며, 쓰기는 이벤트 콜백 안에서만 한다(렌더 중 ref 갱신 금지).
 * - 성공하면 **서버 응답의 visibility** 를 위로 올린다(요청값과 다르더라도 서버 값을 신뢰).
 *   낙관 표시를 하지 않으므로 성공 전까지 화면 상태는 그대로다.
 * - 실패하면 상태를 바꾸지 않고 오류 플래그만 세운다. raw 서버 메시지·내부 코드는 노출하지 않고
 *   호출부가 기존 문구 키로 안내한다. 재시도는 사용자가 토글을 다시 누르는 방식이다.
 *
 * 이 훅은 목록 전체 상태를 모르고, 갱신은 `onChanged` 로 상위(공유 memberFeed)에 위임한다 —
 * 카드만 바뀌고 우측 rail 이 과거 값으로 남는 구조를 만들지 않기 위해서다.
 */
export function useCardVisibility({
  publicId,
  visibility,
  onChanged,
}: {
  publicId: string;
  visibility: CardVisibility;
  onChanged: (publicId: string, next: CardVisibility) => void;
}): {
  pending: boolean;
  failed: boolean;
  toggle: () => void;
} {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);

  const toggle = useCallback(() => {
    if (lock.current) return; // pending 중 중복 요청 차단
    lock.current = true;
    setPending(true);
    setFailed(false);
    const next: CardVisibility = visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    void changeCardVisibility(publicId, next)
      .then((card) => {
        // 서버가 확정한 값만 반영한다(요청값이 아니라 응답값).
        onChanged(publicId, card.visibility);
      })
      .catch(() => {
        setFailed(true); // 기존 visibility 유지 — 목록 전체를 오류로 바꾸지 않는다
      })
      .finally(() => {
        lock.current = false;
        setPending(false);
      });
  }, [onChanged, publicId, visibility]);

  return { pending, failed, toggle };
}
