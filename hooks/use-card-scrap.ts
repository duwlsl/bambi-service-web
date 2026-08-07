"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { scrapCard, unscrapCard } from "@/lib/repositories/scraps";
import { isUuid } from "@/lib/utils";

/**
 * 카드 보관(스크랩) 토글 훅 — POST/DELETE /api/cards/{publicId}/scrap.
 *
 * 상태 규약은 좋아요(`use-card-like.ts`)와 같다:
 * - 초기값은 서버 응답의 검증된 `scrapped`(어댑터 `toScrapped`)에서 받는다. 값을 모르는 카드
 *   (`null`)는 **호출부가 버튼 자체를 렌더하지 않으므로** 이 훅은 boolean 만 받는다.
 * - 응답의 `{ scrapped }` 를 **확정값으로 그대로 반영**한다. 낙관적 업데이트를 하지 않으므로
 *   실패 시 되돌릴 상태가 없고, 멱등 API 라 이중 클릭에도 상태가 어긋나지 않는다
 *   (2026-08-07 실측: POST 두 번 → 둘 다 `{scrapped:true}`).
 * - 진행 중 재진입은 **ref 락**으로 막는다. 같은 tick 에 연달아 들어온 클릭은 리렌더 전이라
 *   busy state 가 아직 false 로 보여 그대로 통과한다 — ref 는 동기라 첫 클릭이 즉시 잠근다.
 *   busy state 는 표시용(disabled·aria-busy)으로만 쓴다.
 * - 실패하면 기존 상태를 유지하고 `failed` 만 세운다 → 같은 버튼으로 바로 재시도할 수 있다.
 *   실패한 동작이 담기였는지 해제였는지는 **바뀌지 않은 `scrapped` 값이 그대로 말해 주므로**
 *   따로 들고 다니지 않는다(문구 선택은 호출부). 서버 error.message 원문은 쓰지 않는다.
 *
 * 좋아요 훅과 다른 점 두 가지:
 * - `publicId` 가 UUID 가 아니면 **요청을 만들지 않는다.** 이 훅은 공개 피드(카드 여러 장)에서도
 *   쓰여 확실한 404 를 부를 여지를 남기지 않는다.
 * - **언마운트 뒤 setState 를 하지 않는다.** 피드는 재조회·필터로 카드가 요청 도중 사라질 수 있다
 *   (상세 전용인 좋아요 훅에는 없던 경로다). AbortController 는 쓰지 않는다 — 스크랩 repository 가
 *   signal 을 받지 않고, 무엇보다 **쓰기 요청은 중단해도 서버 반영이 이미 일어날 수 있어**
 *   "취소했으니 안 담겼다"고 단정할 수 없다. 요청은 그대로 두고 결과 반영만 건너뛴다.
 *
 * 인증 게이트는 이 훅이 하지 않는다 — 호출부(CardScrapButton)가 useRequireAuth 로 감싸
 * 게스트 클릭이 /scrap 요청 자체를 만들지 않게 한다.
 */
export type CardScrapState = {
  scrapped: boolean;
  busy: boolean;
  /** 마지막 시도가 실패했는지. 실패해도 `scrapped` 는 그대로다 → 문구는 호출부가 고른다. */
  failed: boolean;
  toggle: () => void;
};

export function useCardScrap({
  publicId,
  initialScrapped,
}: {
  publicId: string;
  initialScrapped: boolean;
}): CardScrapState {
  const [scrapped, setScrapped] = useState(initialScrapped);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false); // 동기 가드 — 같은 tick 연타를 첫 클릭이 즉시 막는다
  const alive = useRef(true);

  // 언마운트 뒤 응답이 와도 상태를 건드리지 않는다(effect 에서 setState 하지 않는다).
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const toggle = useCallback(() => {
    if (inFlight.current) return; // 진행 중 재진입 차단 — 요청은 항상 1건
    if (!isUuid(publicId)) return; // 경로를 만들 수 없는 값으로는 요청하지 않는다
    inFlight.current = true;
    setBusy(true);
    setFailed(false);
    // 현재 확정 상태의 반대 방향으로만 부른다(담겨 있으면 해제, 아니면 담기).
    const call = scrapped ? unscrapCard(publicId) : scrapCard(publicId);
    void call
      .then((data) => {
        if (!alive.current) return;
        setScrapped(data.scrapped); // 서버 확정값 — 요청 방향이 아니라 응답값을 믿는다
      })
      .catch(() => {
        if (!alive.current) return;
        setFailed(true); // 기존 상태 유지(되돌릴 낙관적 변경이 없다)
      })
      .finally(() => {
        inFlight.current = false;
        if (alive.current) setBusy(false);
      });
  }, [publicId, scrapped]);

  return { scrapped, busy, failed, toggle };
}
