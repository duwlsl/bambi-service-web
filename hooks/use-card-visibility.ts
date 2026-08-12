"use client";

import { useCallback, useRef, useState } from "react";

import { changeCardVisibility } from "@/lib/repositories/card";
import { isMorningBriefing } from "@/lib/report-type";
import type { CardVisibility } from "@/types/feed";

/**
 * `change` 한 번의 결과 — 호출부가 **그 클릭의 결과만** 보고 안내를 고를 수 있게 promise 로 돌려준다.
 *
 * 상태 플래그(`pending`·`failed`·`blocked`·`confirmed`)는 그대로 남는다. "지금 이 요청이 어떻게
 * 됐나"(토스트·되돌리기)는 결과값이, "지금 화면이 어떤 상태인가"(버튼 비활성 등)는 플래그가 맡는다.
 * `busy` 는 실패가 아니라 **중복 클릭이 락에 막힌 것**이라 요청 자체가 나가지 않은 경우다 —
 * 호출부는 아무것도 알리지 않는다(이미 진행 중인 요청의 결과가 곧 온다).
 */
export type VisibilityChangeResult =
  | { ok: true; visibility: CardVisibility }
  | { ok: false; reason: "blocked" | "failed" | "busy" };

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
 *
 * ## 아침 브리핑 공개 전환 차단
 *
 * 아침 브리핑은 공개 상태로 바꿀 수 없다. 화면에서 CTA 를 감추는 것과 **별개로 이 훅에서도**
 * 막는다 — 여기가 프론트의 유일한 공개 전환 mutation 진입점이라, UI 조건이 바뀌거나 다른
 * 호출부가 생겨도 실수로 요청이 나가지 않게 하려는 것이다. 막을 때는 네트워크 요청을
 * **보내지 않고** `blocked` 만 세운다(서버 왕복으로 확인하지 않는다).
 *
 * 반대 방향(PUBLIC → PRIVATE)은 막지 않는다. 이미 공개된 비정상 데이터를 사용자가 되돌릴
 * 길까지 막으면 노출을 스스로 거둘 수 없게 된다 — 차단 대상은 "공개로 만드는" 행동뿐이다.
 */
export function useCardVisibility({
  publicId,
  reportType,
  onChanged,
}: {
  publicId: string;
  /**
   * 카드의 생성 종류(`CardResponse.reportType` 원본값). 판정은 `lib/report-type.ts` 가 하므로
   * 여기서는 좁히지 않고 그대로 받는다 — 필드 누락·계약 밖 값도 그쪽에서 한 번에 처리된다.
   */
  reportType?: unknown;
  /** 서버가 확정한 값만 넘어온다. 대상 카드는 호출부가 이미 알고 있어 id 를 다시 넘기지 않는다. */
  onChanged: (next: CardVisibility) => void;
}): {
  pending: boolean;
  failed: boolean;
  /** 아침 브리핑을 공개로 바꾸려 해서 요청 없이 거절됐는지 — 호출부가 안내 문구를 고른다. */
  blocked: boolean;
  /** 서버가 확정해 준 마지막 값. 아직 성공한 변경이 없으면 null — 성공 안내 문구의 근거다. */
  confirmed: CardVisibility | null;
  /** 이 호출의 결과로 resolve 한다(reject 하지 않는다) — 호출부가 안내·되돌리기를 그 자리에서 고른다. */
  change: (next: CardVisibility) => Promise<VisibilityChangeResult>;
} {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [confirmed, setConfirmed] = useState<CardVisibility | null>(null);
  const lock = useRef(false);
  const publishBlocked = isMorningBriefing(reportType);

  const change = useCallback(
    (next: CardVisibility): Promise<VisibilityChangeResult> => {
      if (lock.current) return Promise.resolve({ ok: false, reason: "busy" }); // pending 중 중복 요청 차단
      // 아침 브리핑 → 공개: 요청을 보내지 않고 여기서 끝낸다(UI 가 CTA 를 감추는 것과 이중 방어).
      if (next === "PUBLIC" && publishBlocked) {
        setBlocked(true);
        setFailed(false);
        return Promise.resolve({ ok: false, reason: "blocked" });
      }
      setBlocked(false);
      lock.current = true;
      setPending(true);
      setFailed(false);
      return changeCardVisibility(publicId, next)
        .then((card): VisibilityChangeResult => {
          // 서버가 확정한 값만 반영한다(요청값이 아니라 응답값).
          setConfirmed(card.visibility);
          onChanged(card.visibility);
          return { ok: true, visibility: card.visibility };
        })
        .catch((): VisibilityChangeResult => {
          setFailed(true); // 기존 visibility 유지 — 화면을 오류 화면으로 바꾸지 않는다
          return { ok: false, reason: "failed" };
        })
        .finally(() => {
          lock.current = false;
          setPending(false);
        });
    },
    [onChanged, publicId, publishBlocked],
  );

  return { pending, failed, blocked, confirmed, change };
}
