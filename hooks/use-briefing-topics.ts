"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { resolveErrorMessage } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";
import { fetchBriefingTopics, saveBriefingTopics } from "@/lib/repositories/briefing";

/**
 * 아침 브리핑 주제 선택 — 조회(GET) + 저장(PUT) 훅.
 *
 * **여기가 다루는 것은 "서버에 저장된 값" 하나다.** 사용자가 화면에서 편집 중인 선택은 화면
 * 컴포넌트의 로컬 상태이고, 이 훅은 그것을 모른다. 두 값을 한 곳에 섞으면 저장 전 선택이
 * "현재 설정"으로 새어 나가기 때문이다(설정 rail 이 이 훅의 값만 읽는 이유).
 *
 * 상태 규약:
 * - **빈 배열은 정상 상태**다(미선택). `empty` 로 따로 분기하지 않는다 — Wiki 태그와 달리 여기서
 *   빈 값은 "아직 없음"이 아니라 "선택 안 함"이라는 확정 정보다.
 * - 조회 실패를 빈 배열로 대체하지 않는다(§9). error 는 error 로 남기고 재시도를 제공한다.
 * - 저장 성공 시 **서버가 돌려준 정규화 결과**로 저장 상태를 갈아끼운다. 재조회(GET)를 하지 않는
 *   이유는 그 사이 status 가 loading 으로 돌아가 선택 UI 가 통째로 언마운트되기 때문이다
 *   (사용자가 방금 고른 값이 화면에서 사라진다).
 * - 성공 응답 전에는 로컬 값을 저장된 것처럼 보여주지 않는다 — 낙관적 갱신을 하지 않는다.
 *
 * 중복 저장 방지는 use-on-demand-generation.ts 와 같은 **ref 동기 락**이다: 같은 tick 연타는
 * 리렌더 전이라 saving state 가 아직 false 로 보여 통과하지만, ref 는 첫 클릭이 즉시 잠근다.
 */
export type BriefingTopicsState =
  | { status: "loading" }
  | { status: "success"; data: string[] }
  | { status: "error" };

export type BriefingTopicsActions = {
  refetch: () => void;
  /** 전체 교체 저장. `onSaved` 로 서버 정규화 결과를 호출부(로컬 편집 상태)에 되돌려 준다. */
  save: (topics: string[], onSaved?: (normalized: string[]) => void) => void;
  saving: boolean;
  /** 최근 저장이 성공했는지. 선택을 다시 건드리면 호출부가 `clearSaveResult()` 로 지운다. */
  savedOnce: boolean;
  /** 저장 실패 문구(코드 기준 매핑). null 이면 오류 없음. */
  saveErrorMessage: string | null;
  clearSaveResult: () => void;
};

export function useBriefingTopics(): BriefingTopicsState & BriefingTopicsActions {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const fetcher = useCallback((signal: AbortSignal) => fetchBriefingTopics(signal), []);
  const query = useAsyncData<string[]>(fetcher, enabled);

  // 저장 성공으로 확정된 값. 조회 결과보다 우선한다(재조회 없이 서버 확정본을 반영하기 위해).
  const [savedOverride, setSavedOverride] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const inFlight = useRef(false); // 동기 가드 — 같은 tick 연타를 첫 클릭이 즉시 막는다
  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort(); // 언마운트 후 setState 방지 + 진행 중 요청 정리
    };
  }, []);

  const clearSaveResult = useCallback(() => {
    setSavedOnce(false);
    setSaveErrorMessage(null);
  }, []);

  // 재조회는 서버를 다시 읽는 것이므로, 저장으로 덮어썼던 값을 걷어내고 조회 결과를 따르게 한다.
  const refetch = useCallback(() => {
    setSavedOverride(null);
    clearSaveResult();
    query.refetch();
  }, [query, clearSaveResult]);

  const save = useCallback((topics: string[], onSaved?: (normalized: string[]) => void) => {
    if (inFlight.current) return; // 진행 중 재진입 차단 — 요청은 항상 1건
    inFlight.current = true;
    setSaving(true);
    setSavedOnce(false);
    setSaveErrorMessage(null);

    const controller = new AbortController();
    abortRef.current = controller;

    saveBriefingTopics(topics, controller.signal)
      .then((normalized) => {
        if (!mounted.current) return;
        setSavedOverride(normalized);
        setSavedOnce(true);
        onSaved?.(normalized);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || !mounted.current) return; // abort 는 오류로 취급하지 않는다
        // 실패 시 저장 상태를 건드리지 않는다 — 화면의 로컬 선택도 그대로 남아 바로 재시도할 수 있다.
        setSaveErrorMessage(resolveErrorMessage(err instanceof ApiError ? err.code : null));
      })
      .finally(() => {
        inFlight.current = false;
        if (mounted.current) setSaving(false);
      });
  }, []);

  const actions: BriefingTopicsActions = {
    refetch,
    save,
    saving,
    savedOnce,
    saveErrorMessage,
    clearSaveResult,
  };

  if (savedOverride !== null) return { status: "success", data: savedOverride, ...actions };
  if (query.status === "success") return { status: "success", data: query.data, ...actions };
  if (query.status === "error") return { status: "error", ...actions };
  return { status: "loading", ...actions }; // idle · loading → 데이터 로딩
}
