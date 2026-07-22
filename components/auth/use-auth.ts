"use client";

import { createContext, useContext } from "react";

import type { User } from "@/types/auth";

/**
 * 인증 상태 모델 (CLAUDE.md §5·§15).
 *
 * - loading: 저장 토큰으로 인증 복구 중 (초기 진입·새로고침·재시도)
 * - guest: 비로그인 — 토큰 없음, 또는 401·403으로 토큰 제거됨. 공개 홈·상세는 열람 가능
 * - authenticated: getMe() 성공 또는 로그인/회원가입 직후
 * - error: 500·네트워크 오류 — 공개 콘텐츠는 유지하되 로그인 전용 UI는 숨기고 재시도 가능
 */
export type AuthStatus = "loading" | "guest" | "authenticated" | "error";

export type AuthContextValue = {
  status: AuthStatus;
  /** 인증된 사용자. guest·loading·error 에서는 null (guest 화면에 사용자 정보 노출 금지). */
  user: User | null;
  /** 저장된 토큰으로 인증을 복구한다. error 상태에서 재시도 진입점으로도 쓴다. */
  refreshAuth: () => Promise<void>;
  /** 로그인·회원가입 성공 직후 사용자 상태를 즉시 반영한다. */
  setAuthenticatedUser: (user: User) => void;
  /** 로컬 토큰을 제거하고 guest 로 전환한다(공개 홈 `/` 유지, 강제 리다이렉트 없음). */
  logoutUser: () => void;
};

/** Provider 미연결 시 null — useAuth 가 명시적으로 throw 한다. */
export const AuthContext = createContext<AuthContextValue | null>(null);

/** 인증 상태 소비 훅. <AuthProvider> 내부에서만 사용한다. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth 는 <AuthProvider> 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
