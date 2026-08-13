import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { HomeScreen } from "@/components/home/home-screen";
import { ACCESS_TOKEN_STORAGE_KEY } from "@/constants/auth";
import type { User } from "@/types/auth";

import { server } from "../setup/msw-server";
import { renderWithProviders } from "../setup/render";

/**
 * 홈 — 페이지 heading(FE-QA-003)과 탭 키보드 계약(FE-QA-005).
 *
 * 홈 화면을 통째로 렌더한다: 검증 대상이 "이 페이지의 heading 아웃라인"과 "tablist ↔ tabpanel
 * 관계"라 부분 하네스로는 의미가 없다(카드·rail 이 함께 있어야 h1 이 유일한지, 패널이 정말
 * 두 개인지 확인된다). 네트워크는 홈이 실제로 부르는 요청만 MSW 로 받는다.
 */
const ME: User = { id: 1, email: "qa@bambi.test", displayName: "밤비", roles: ["USER"] };

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, error: null });
}

/**
 * `?tab=` 값을 테스트마다 바꾸기 위해 next/navigation 을 여기서 다시 mock 한다.
 * (공통 setup 의 mock 은 항상 빈 쿼리라 URL 진입 상태를 검증할 수 없다.)
 * usePathname 은 홈 로고 클릭 판단에 쓰이므로 실제와 같은 "/" 를 준다.
 */
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => searchParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

/** 로그인 상태(2탭)로 홈을 세운다. 목록은 비워 둔다 — 이 테스트가 보는 건 heading·탭뿐이다. */
async function renderMemberHome() {
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "test-token");
  server.use(
    http.get("http://localhost/api/auth/me", () => ok(ME)),
    http.get("http://localhost/api/feed", () => ok([])),
    http.get("http://localhost/api/reports/pending", () => ok([])),
    http.get("http://localhost/api/interests", () => ok([])),
    http.get("http://localhost/api/notifications", () => ok([])),
  );
  renderWithProviders(<HomeScreen />);
  return screen.findByRole("tab", { name: "내 보고서" });
}

/** guest 홈 — 토큰이 없으면 AuthProvider 가 /api/auth/me 를 부르지 않고 바로 guest 로 확정한다. */
async function renderGuestHome() {
  server.use(http.get("http://localhost/api/feed/public", () => ok([])));
  renderWithProviders(<HomeScreen />);
  return screen.findByRole("tab", { name: "피드" });
}

beforeEach(() => {
  searchParams = new URLSearchParams();
});

describe("홈 heading", () => {
  test("페이지에 h1 이 하나 있고, 그 아래 heading 들보다 앞선다", async () => {
    await renderMemberHome();

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("홈");

    // heading 아웃라인의 최상위여야 한다 — 예전에는 첫 heading 이 카드 h3 였다.
    const headings = screen.getAllByRole("heading");
    expect(headings[0]).toBe(h1s[0]);
  });

  test("guest 홈에도 h1 이 하나만 있다", async () => {
    await renderGuestHome();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});

describe("홈 탭 — ARIA 관계", () => {
  test("tablist·tab·tabpanel 이 서로를 가리킨다", async () => {
    await renderMemberHome();

    const tablist = screen.getByRole("tablist", { name: "홈 피드 전환" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["내 보고서", "피드"]);

    for (const tab of tabs) {
      const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute("role", "tabpanel");
      // 패널이 자기 탭을 이름으로 가져간다(양방향 연결).
      expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    }

    // 선택 상태는 정확히 하나다.
    expect(tabs.filter((t) => t.getAttribute("aria-selected") === "true")).toHaveLength(1);
  });

  test("활성 탭만 tabIndex=0 이고 나머지는 -1 이다 (roving tabindex)", async () => {
    const user = userEvent.setup();
    await renderMemberHome();

    const mine = screen.getByRole("tab", { name: "내 보고서" });
    const rec = screen.getByRole("tab", { name: "피드" });
    expect(mine).toHaveAttribute("tabindex", "0");
    expect(rec).toHaveAttribute("tabindex", "-1");

    // 선택이 바뀌면 Tab 진입 지점도 함께 옮겨간다.
    await user.click(rec);
    expect(mine).toHaveAttribute("tabindex", "-1");
    expect(rec).toHaveAttribute("tabindex", "0");
  });
});

describe("홈 탭 — 키보드·마우스 조작", () => {
  test("ArrowRight/ArrowLeft 로 이동하면서 그 자리에서 활성화된다", async () => {
    const user = userEvent.setup();
    await renderMemberHome();

    const mine = screen.getByRole("tab", { name: "내 보고서" });
    const rec = screen.getByRole("tab", { name: "피드" });

    mine.focus();
    await user.keyboard("{ArrowRight}");
    expect(rec).toHaveFocus();
    expect(rec).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("panel-rec")).not.toHaveAttribute("hidden");
    expect(document.getElementById("panel-mine")).toHaveAttribute("hidden");

    await user.keyboard("{ArrowLeft}");
    expect(mine).toHaveFocus();
    expect(mine).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("panel-mine")).not.toHaveAttribute("hidden");

    // 양끝에서 순환한다.
    await user.keyboard("{ArrowLeft}");
    expect(rec).toHaveFocus();
    expect(rec).toHaveAttribute("aria-selected", "true");
  });

  test("Enter·Space·마우스 클릭은 그대로 동작한다", async () => {
    const user = userEvent.setup();
    await renderMemberHome();

    const mine = screen.getByRole("tab", { name: "내 보고서" });
    const rec = screen.getByRole("tab", { name: "피드" });

    await user.click(rec);
    expect(rec).toHaveAttribute("aria-selected", "true");

    mine.focus();
    await user.keyboard("{Enter}");
    expect(mine).toHaveAttribute("aria-selected", "true");

    rec.focus();
    await user.keyboard(" ");
    expect(rec).toHaveAttribute("aria-selected", "true");
  });

  test("guest 는 탭이 하나뿐이라 방향키가 선택을 바꾸지 않는다", async () => {
    const user = userEvent.setup();
    const rec = await renderGuestHome();

    expect(screen.getAllByRole("tab")).toHaveLength(1);
    rec.focus();
    await user.keyboard("{ArrowRight}");
    expect(rec).toHaveAttribute("aria-selected", "true");
    expect(rec).toHaveAttribute("tabindex", "0");
  });
});

describe("홈 탭 — URL 진입 상태", () => {
  test("?tab=feed 로 들어오면 [피드] 탭이 선택된 채 시작한다", async () => {
    searchParams = new URLSearchParams("tab=feed");
    await renderMemberHome();

    expect(screen.getByRole("tab", { name: "피드" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "피드" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "내 보고서" })).toHaveAttribute("aria-selected", "false");
    expect(document.getElementById("panel-rec")).not.toHaveAttribute("hidden");
  });

  test("쿼리가 없으면 [내 보고서] 탭으로 시작한다", async () => {
    await renderMemberHome();

    expect(screen.getByRole("tab", { name: "내 보고서" })).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("panel-mine")).not.toHaveAttribute("hidden");
  });
});
