"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import {
  applyResolvedTheme,
  getStoredThemeMode,
  resolveThemeMode,
  setStoredThemeMode,
  type ThemeMode,
} from "@/lib/theme";

/**
 * 테마(화면 모드) 상태 계층 — 라이트/다크/시스템.
 *
 * - 최초 적용은 layout 의 인라인 스크립트가 paint 전에 처리한다(FOUC 방지). 여기서는 저장값으로 상태를
 *   초기화하고, 선택 변경 시 즉시 적용·저장하며, system 모드에서 OS 변경을 실시간 반영한다.
 * - 저장값을 lazy 초기화로 읽는다: 서버는 기본값(system), 클라이언트는 저장값을 쓴다. 이 값에 의존하는
 *   SSR DOM 이 없으므로(설정 본문은 인증 확정 후에만 렌더) 하이드레이션 불일치가 없다.
 */
type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredThemeMode());

  // mode 변화(마운트 포함)마다 DOM 에 적용한다. applyResolvedTheme 는 idempotent(인라인 스크립트와 중복돼도 무해).
  useEffect(() => {
    applyResolvedTheme(resolveThemeMode(mode));
  }, [mode]);

  // system 모드일 때만 OS 테마 변경을 실시간 반영한다.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyResolvedTheme(resolveThemeMode("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setStoredThemeMode(next); // DOM 적용은 위 [mode] effect 가 담당한다.
  }, []);

  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme 는 <ThemeProvider> 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
