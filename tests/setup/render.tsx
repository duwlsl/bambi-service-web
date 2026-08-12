import type { ReactElement, ReactNode } from "react";

import { render, type RenderOptions, type RenderResult } from "@testing-library/react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { GuestGateProvider } from "@/components/auth/guest-gate-provider";

/**
 * 테스트 전용 render — 앱이 실제로 감싸는 provider 만 그대로 씌운다(app/layout.tsx 와 같은 조합).
 *
 * 화면 컴포넌트는 인증 상태(useAuth)와 가입 유도 게이트(useRequireAuth)를 provider 로 받는다.
 * 그 둘을 가짜로 대체하면 "인증 확정 전에는 데이터를 요청하지 않는다" 같은 실제 규칙이 테스트에서
 * 사라지므로, **진짜 provider 를 쓰고 토큰 유무로만 상태를 만든다**(토큰 없음 = guest).
 * provider 조합이 늘면 여기 한 곳만 고친다 — 앱 구조를 테스트 쪽에 복제하지 않는다.
 */
function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GuestGateProvider>{children}</GuestGateProvider>
    </AuthProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return render(ui, { wrapper: Providers, ...options });
}
