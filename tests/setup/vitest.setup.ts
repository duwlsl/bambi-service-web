import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { server } from "./msw-server";

/**
 * Vitest 공통 setup — jest-dom matcher · MSW 수명주기 · 테스트 간 상태 정리.
 *
 * Next 전용 모듈 mock 은 **실제로 렌더 트리에 걸리는 범위까지만** 둔다. 지금 필요한 건
 * `next/navigation` 하나다(홈 내비가 usePathname 을 읽는다) — App Router 컨텍스트는 테스트에
 * 존재하지 않으므로 훅만 최소로 대체한다. next/link 는 그대로 두어 실제 앵커가 렌더되게 한다
 * (사용자가 보는 결과를 검증하기 위해 필요하다).
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

// 등록되지 않은 요청은 오류로 드러낸다 — 실서버로 새어 나가는 요청을 만들지 않기 위해서다.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
  cleanup();
  window.localStorage.clear();
});

afterAll(() => server.close());
