"use client";

import { useCallback, useContext, createContext } from "react";

import { useAuth } from "@/components/auth/use-auth";

/**
 * GuestGate — 인증 필요 액션의 공통 가드 (CLAUDE.md §15).
 *
 * 트리 어디서든 인증 필요 액션을 requireAuth 로 감싸면, 인증 상태에 따라
 * 액션 실행 / 가입 유도 모달 / 인증 확인 실패 안내로 분기된다. 모달은 GuestGateProvider 가
 * 전역 단일 인스턴스로 렌더한다.
 */
export type GuestGateMode = "signup" | "error";

export type GuestGateContextValue = {
  /** 가입 유도(signup) 또는 인증 확인 실패(error) 모달을 연다. */
  open: (mode: GuestGateMode) => void;
};

/** Provider 미연결 시 null — 소비 훅이 명시적으로 throw 한다. */
export const GuestGateContext = createContext<GuestGateContextValue | null>(null);

export type RequireAuth = {
  /**
   * 인증 필요 액션 가드.
   * - authenticated: action 실행
   * - guest: 가입 유도 모달
   * - error: 인증 확인 실패 안내 + 재시도 모달
   * - loading: 아무 것도 하지 않음(인증 확인 전 — 개인/인증 전용 동작 실행 금지)
   */
  requireAuth: (action: () => void) => void;
};

export function useRequireAuth(): RequireAuth {
  const { status } = useAuth();
  const gate = useContext(GuestGateContext);
  if (gate === null) {
    throw new Error("useRequireAuth 는 <GuestGateProvider> 내부에서만 사용할 수 있습니다.");
  }

  const { open } = gate;
  const requireAuth = useCallback(
    (action: () => void) => {
      if (status === "authenticated") {
        action();
        return;
      }
      if (status === "error") {
        open("error"); // 조용히 무시하지 않고 재시도 수단을 제공
        return;
      }
      if (status === "guest") {
        open("signup");
        return;
      }
      // loading: 인증 확인 전 — 개인정보·인증 전용 동작을 실행하지 않는다.
    },
    [status, open],
  );

  return { requireAuth };
}
