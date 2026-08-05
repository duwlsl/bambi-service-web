"use client";

import { useCallback, useRef, useState } from "react";

import { changeCardVisibility } from "@/lib/repositories/card";
import type { CardVisibility } from "@/types/feed";

/**
 * 카드 공개 범위 변경 훅 — **카드 상세의 공유 모달**에서 쓴다(카드 소유자 전용).
 *
 * 목록에는 이 훅을 쓰지 않는다. 공개 전환은 다른 사용자 피드 노출·댓글·좋아요로 이어지는 행동이라
 * 목록의 한 번 클릭이 아니라 상태를 설명하는 모달의 명시적 버튼으로만 실행한다.
 *
 * - 바꿀 값(`next`)을 **호출부가 명시**한다. 현재 상태의 반대값을 훅이 추측하지 않는다 —
 *   모달 버튼(`공개하기` / `비공개로 전환`)이 이미 목표 상태를 문구로 밝히고 있다.
 * - pending 중에는 추가 요청을 막는다(빠른 연속 클릭 포함). ref 락이라 state 반영을 기다리지 않고
 *   즉시 차단되며, 쓰기는 이벤트 콜백 안에서만 한다(렌더 중 ref 갱신 금지).
 * - 성공하면 **서버 응답의 visibility** 를 위로 올린다(요청값과 다르더라도 서버 값을 신뢰).
 *   낙관 표시를 하지 않으므로 성공 전까지 화면 상태는 그대로다.
 * - 실패하면 상태를 바꾸지 않고 오류 플래그만 세운다. raw 서버 메시지·내부 코드는 노출하지 않고
 *   호출부가 문구를 고른다. 재시도는 사용자가 같은 버튼을 다시 누르는 방식이다.
 *
 * 응답 **전체로 카드를 교체하지 않는다** — 확정 `visibility` 만 `onChanged` 로 올린다.
 * PATCH 응답은 목록용 변환 경로(CardResponse.from)를 타서 `author`·`likeCount`·`liked` 가 모두
 * null 이다(2026-08-05 실측). 통째로 갈아끼우면 좋아요 UI 와 소유자 판정이 사라진다.
 */
export function useCardVisibility({
  publicId,
  onChanged,
}: {
  publicId: string;
  /** 서버가 확정한 값만 넘어온다. 대상 카드는 호출부가 이미 알고 있어 id 를 다시 넘기지 않는다. */
  onChanged: (next: CardVisibility) => void;
}): {
  pending: boolean;
  failed: boolean;
  /** 서버가 확정해 준 마지막 값. 아직 성공한 변경이 없으면 null — 성공 안내 문구의 근거다. */
  confirmed: CardVisibility | null;
  change: (next: CardVisibility) => void;
} {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmed, setConfirmed] = useState<CardVisibility | null>(null);
  const lock = useRef(false);

  const change = useCallback(
    (next: CardVisibility) => {
      if (lock.current) return; // pending 중 중복 요청 차단
      lock.current = true;
      setPending(true);
      setFailed(false);
      void changeCardVisibility(publicId, next)
        .then((card) => {
          // 서버가 확정한 값만 반영한다(요청값이 아니라 응답값).
          setConfirmed(card.visibility);
          onChanged(card.visibility);
        })
        .catch(() => {
          setFailed(true); // 기존 visibility 유지 — 화면을 오류 화면으로 바꾸지 않는다
        })
        .finally(() => {
          lock.current = false;
          setPending(false);
        });
    },
    [onChanged, publicId],
  );

  return { pending, failed, confirmed, change };
}
