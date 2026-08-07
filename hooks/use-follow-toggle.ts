"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { followUser, unfollowUser } from "@/lib/repositories/profile";
import { isUuid } from "@/lib/utils";
import type { FollowData } from "@/types/profile";

/**
 * 팔로우/언팔 토글 훅 — POST/DELETE /api/users/{publicId}/follow.
 *
 * 프로필 hero 버튼과 팔로워/팔로잉 모달의 각 행이 **같은 훅**을 쓴다. 모달용 follow 로직을
 * 따로 만들지 않는다. 상태 규약은 좋아요·스크랩 훅과 같다:
 *
 * - 응답 `{ following, followerCount }` 를 **확정값으로 그대로** 호출부에 넘긴다.
 *   낙관적 갱신을 하지 않으므로 실패 시 되돌릴 상태가 없고, 멱등 API 라 이중 클릭에도 어긋나지 않는다.
 * - 진행 중 재진입은 **ref 락**으로 막는다. 같은 tick 에 연달아 들어온 클릭은 리렌더 전이라
 *   busy state 가 아직 false 로 보여 그대로 통과한다 — ref 는 동기라 첫 클릭이 즉시 잠근다.
 *   busy state 는 표시용(disabled·aria-busy)으로만 쓴다.
 * - 실패하면 기존 상태를 유지하고 `failed` 만 세운다 → 같은 버튼으로 바로 재시도할 수 있다.
 *   서버 error.message 원문은 쓰지 않는다(문구는 호출부가 고른다).
 * - `publicId` 가 UUID 가 아니면 요청을 만들지 않는다 — 목록에는 행이 여럿이라 확실한 404 를
 *   부를 여지를 남기지 않는다(스크랩 훅과 같은 방어).
 * - **언마운트 뒤 setState 를 하지 않는다.** 모달은 요청 도중 닫힐 수 있다. AbortController 는
 *   쓰지 않는다 — 쓰기 요청은 중단해도 서버 반영이 이미 일어날 수 있어 "취소했으니 안 됐다"고
 *   단정할 수 없다. 요청은 그대로 두고 결과 반영만 건너뛴다.
 *
 * 인증 게이트는 이 훅이 하지 않는다 — 호출부가 useRequireAuth 로 감싸 게스트 클릭이
 * /follow 요청 자체를 만들지 않게 한다.
 */
export type FollowToggleState = {
  busy: boolean;
  /** 마지막 시도가 실패했는지. 실패해도 상태는 그대로다 → 문구는 호출부가 고른다. */
  failed: boolean;
  toggle: () => void;
};

export function useFollowToggle({
  publicId,
  following,
  onChange,
}: {
  publicId: string;
  /** 현재 확정 상태. 이 값의 **반대 방향**으로만 호출한다. */
  following: boolean;
  /** 서버 확정 응답. 호출부가 자기 상태(hero·행)에 반영한다. */
  onChange: (next: FollowData) => void;
}): FollowToggleState {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false); // 동기 가드 — 같은 tick 연타를 첫 클릭이 즉시 막는다
  const alive = useRef(true);

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
    const call = following ? unfollowUser(publicId) : followUser(publicId);
    void call
      .then((data) => {
        if (!alive.current) return;
        onChange(data); // 요청 방향이 아니라 응답값을 믿는다
      })
      .catch(() => {
        if (!alive.current) return;
        setFailed(true); // 기존 상태 유지(되돌릴 낙관적 변경이 없다)
      })
      .finally(() => {
        inFlight.current = false;
        if (alive.current) setBusy(false);
      });
  }, [publicId, following, onChange]);

  return { busy, failed, toggle };
}
