"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";

import { GuestGateModal } from "@/components/auth/guest-gate-modal";
import { useAuth } from "@/components/auth/use-auth";
import { GuestGateContext, type GuestGateContextValue, type GuestGateMode } from "@/components/auth/use-require-auth";

/**
 * GuestGate 전역 단일 모달 인스턴스 + open 컨텍스트 제공.
 * AuthProvider 안쪽(useAuth 사용)에 마운트한다. 트리 어디서든 useRequireAuth 로 열 수 있다.
 */
type GateState = { open: boolean; mode: GuestGateMode };

export function GuestGateProvider({ children }: { children: ReactNode }) {
  const { refreshAuth } = useAuth();
  const [gate, setGate] = useState<GateState>({ open: false, mode: "signup" });

  const open = useCallback((mode: GuestGateMode) => {
    setGate({ open: true, mode });
  }, []);
  const close = useCallback(() => {
    setGate((prev) => ({ ...prev, open: false }));
  }, []);
  const retry = useCallback(() => {
    setGate((prev) => ({ ...prev, open: false }));
    void refreshAuth(); // error 모달의 "다시 시도" — 인증 상태 재확인
  }, [refreshAuth]);

  const value = useMemo<GuestGateContextValue>(() => ({ open }), [open]);

  return (
    <GuestGateContext.Provider value={value}>
      {children}
      <GuestGateModal open={gate.open} mode={gate.mode} onClose={close} onRetry={retry} />
    </GuestGateContext.Provider>
  );
}
