"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * stale-while-revalidate 배경 polling 프리미티브.
 *
 * hooks/use-async-data.ts 와의 차이: 그 훅의 refetch() 는 내부 reload 카운터를 올려
 * settled 결과 태그를 불일치시키고, 그 결과 status 가 "loading" 으로 되돌아간다(파일 상단
 * 주석에 명시된 의도 — "입력이 바뀌는 순간 즉시 loading 으로 돌아간다"). 사용자가 누르는
 * 재시도 버튼에는 맞지만, 15초·30초 간격의 배경 polling 에 그대로 쓰면 매 tick 마다 기존
 * 데이터가 사라지고 화면이 깜빡인다(hooks/use-notifications.ts 의 30초 refetch 가 이미 이
 * 문제를 갖고 있다 — unread 배지가 주기적으로 사라졌다 돌아온다).
 *
 * 이 훅은 그 문제를 별도 파일로 분리해 고친다: 최초 로드만 "loading" 이고, 이후의 모든
 * 재조회(수동 refetch·interval tick·visibility 복귀)는 기존 data 를 유지한 채
 * isRevalidating=true 로만 표시한다. use-async-data.ts 는 수정하지 않는다(기존 소비자
 * 회귀 위험 — 이 훅은 새 소비자가 opt-in 으로 골라 쓴다).
 *
 * 계약(use-async-data.ts 와 동일한 규율): fetcher 는 호출부가 useCallback 으로 identity 를
 * 고정해서 넘겨야 한다. fetcher 가 매 렌더 새 함수면 매 렌더 재조회 + polling 타이머가
 * 재생성된다 — exhaustive-deps 를 비활성화하지 않고 이 규율로 해결한다.
 */
export type PolledDataState<T> = {
  status: "idle" | "loading" | "success" | "error";
  data?: T;
  error?: unknown;
  isRevalidating: boolean;
  refetch: () => Promise<void>;
};

/**
 * 내부 상태 — 외부에 노출하는 4가지 status 보다 세분화해 "성공 후 배경 재조회"를 구분한다.
 * "idle" 은 여기 없다 — enabled=false 는 저장된 상태가 아니라 훅 반환부에서 enabled 플래그로
 * 곧바로 계산하는 파생값이다(use-async-data.ts 의 "!enabled → idle" 조기 반환과 같은 방식).
 */
type InternalState<T> =
  | { kind: "loading" }
  | { kind: "success"; data: T; revalidating: boolean; error?: unknown }
  | { kind: "error"; error: unknown };

type FetchEvent<T> = { type: "start" } | { type: "success"; data: T } | { type: "failure"; error: unknown };

/**
 * 순수 상태 전이 — 부수효과(요청·타이머·구독) 없이 "현재 상태 + 이벤트 → 다음 상태"만 계산한다.
 * 배경 재조회 실패가 기존 data 를 지우지 않는 규칙(요구사항 8)과, 성공 시 이전 error 가
 * 사라지는 규칙이 여기 한 곳에 있다.
 */
function reduceFetchEvent<T>(prev: InternalState<T>, event: FetchEvent<T>): InternalState<T> {
  switch (event.type) {
    case "start":
      // 기존 성공 데이터가 있으면 그 데이터를 유지한 채 배경 재조회 중으로만 표시한다.
      return prev.kind === "success" ? { ...prev, revalidating: true } : { kind: "loading" };
    case "success":
      return { kind: "success", data: event.data, revalidating: false };
    case "failure":
      // 성공 데이터가 있었던 배경 재조회 실패 — data 는 그대로 두고 error 만 최신으로 보관한다.
      return prev.kind === "success"
        ? { kind: "success", data: prev.data, revalidating: false, error: event.error }
        : { kind: "error", error: event.error };
  }
}

/**
 * refetch 는 일부러 인자로 받지 않는다 — refetch 는 ref 를 읽는 콜백이라, 렌더 중 다른 함수의
 * 인자로 넘기면 react-hooks/refs 린트가 "렌더 중 ref 값을 읽을 수 있다"고 막는다. 호출부가
 * 반환값에 `refetch` 를 스프레드로 얹는 방식으로 피한다.
 */
function toPublicState<T>(internal: InternalState<T>): Omit<PolledDataState<T>, "refetch"> {
  switch (internal.kind) {
    case "loading":
      return { status: "loading", isRevalidating: false };
    case "success":
      return {
        status: "success",
        data: internal.data,
        error: internal.error,
        isRevalidating: internal.revalidating,
      };
    case "error":
      return { status: "error", error: internal.error, isRevalidating: false };
  }
}

export function usePolledData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
  intervalMs: number | null,
): PolledDataState<T> {
  // enabled=true 로 시작하면 effect 가 아직 안 돌았어도 첫 페인트부터 loading 이어야 한다
  // (idle 은 내부 상태로 존재하지 않는다 — 아래 반환부가 enabled 로 직접 계산한다).
  const [internal, setInternal] = useState<InternalState<T>>({ kind: "loading" });

  // 언마운트 이후 setState 방지 — 매 effect 실행 시작에 true, 마지막(진짜 언마운트) cleanup 에서만
  // 계속 false 로 남는다(재실행 중간의 false 는 곧바로 다음 effect 본문이 true 로 되돌린다).
  const mountedRef = useRef(false);
  // 이 요청이 아직 "최신"인지 판정하는 단조 증가 카운터. 재실행·재조회로 새 요청이 시작되면
  // 이전 요청의 응답은 이 값과 더 이상 일치하지 않아 무시된다.
  const requestIdRef = useRef(0);
  // 동시에 최대 1건만 요청이 나가도록 하는 락 — 값은 "현재 진행 중인 요청의 id" 또는 null.
  // 단순 boolean 이 아니라 id 로 비교하는 이유: cleanup 이 다음 effect 를 위해 락을 미리 풀어준
  // 뒤에도, 먼저 시작됐던(이미 abort 된) 요청의 뒤늦은 finally 가 그새 새로 걸린 락을 잘못
  // 풀어버리면 안 되기 때문이다(그 경우 새 요청이 아직 끝나지 않았는데 중복 요청이 새어나간다).
  const inFlightIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(() => {
    if (inFlightIdRef.current !== null) return Promise.resolve(); // 진행 중 — 이 tick/호출은 건너뜀
    const myId = ++requestIdRef.current;
    inFlightIdRef.current = myId;
    const controller = new AbortController();
    abortRef.current = controller;

    setInternal((prev) => reduceFetchEvent(prev, { type: "start" }));

    return fetcher(controller.signal)
      .then((data) => {
        if (!mountedRef.current || myId !== requestIdRef.current) return;
        setInternal((prev) => reduceFetchEvent(prev, { type: "success", data }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return; // abort 는 오류로 취급하지 않는다
        if (!mountedRef.current || myId !== requestIdRef.current) return;
        setInternal((prev) => reduceFetchEvent(prev, { type: "failure", error }));
      })
      .finally(() => {
        if (inFlightIdRef.current === myId) inFlightIdRef.current = null;
      });
  }, [fetcher]);

  const refetch = useCallback(() => runFetch(), [runFetch]);

  useEffect(() => {
    mountedRef.current = true;

    // enabled=false 는 setState 로 동기화하지 않는다 — 아래 반환부가 enabled 로 직접 "idle" 을
    // 계산한다(react-hooks/set-state-in-effect: effect 본문에서 파생 가능한 값을 굳이
    // setState 로 동기화하지 않는다). 여기서는 요청·타이머를 걸지 않고 조용히 끝낸다.
    if (!enabled) return;

    void runFetch(); // 최초(또는 재활성화 직후) 즉시 조회

    let timer: ReturnType<typeof setInterval> | null = null;

    function startTimer() {
      if (intervalMs === null) return;
      if (document.hidden) return; // 숨김 탭에서는 걸지 않는다 — visible 복귀 시 다시 건다
      timer = setInterval(() => void runFetch(), intervalMs);
    }
    function stopTimer() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVisibilityChange() {
      if (document.hidden) {
        stopTimer();
        return;
      }
      // 복귀 즉시 1회 조회(진행 중이면 runFetch 자체의 락이 중복 실행을 막는다) 후 polling 재개.
      void runFetch();
      stopTimer();
      startTimer();
    }

    startTimer();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mountedRef.current = false;
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      abortRef.current?.abort();
      inFlightIdRef.current = null; // 다음 effect 실행이 즉시 새 요청을 시작할 수 있게 락을 선점 해제
    };
  }, [enabled, intervalMs, runFetch]);

  if (!enabled) return { status: "idle", isRevalidating: false, refetch };
  return { ...toPublicState(internal), refetch };
}
