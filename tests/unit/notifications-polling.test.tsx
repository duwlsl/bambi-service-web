import type { ReactElement } from "react";

import { http, HttpResponse } from "msw";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useAuth } from "@/components/auth/use-auth";
import { NotificationMenu } from "@/components/home/notification-menu";
import { ACCESS_TOKEN_STORAGE_KEY } from "@/constants/auth";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationListDto } from "@/types/notification";

import { server } from "../setup/msw-server";
import { renderWithProviders } from "../setup/render";

/**
 * 알림 배경 polling 계약 — `useNotifications` 를 `usePolledData` 로 이관한 뒤의 동작 고정.
 *
 * 회귀 대상(2026-08-28): 이전 구현은 `useAsyncData` + `setInterval(refetch, 30_000)` 이라
 * 30초 tick 마다 status 가 loading 으로 되돌아가 **unread 배지와 열린 목록이 사라졌다 돌아왔고**,
 * `setInterval` 이 visibility 를 보지 않아 **백그라운드 탭에서도 계속 요청**했다.
 *
 * 검증은 두 층위로 나눈다:
 * - 화면(NotificationMenu): 사용자가 실제로 보는 배지·목록·로딩 문구가 유지되는지
 * - 훅(NotificationsProbe): 외부 반환 계약(status·isRevalidating·errorCode)이 유지되는지
 * 요청 수는 **네트워크 경계에서**(MSW) 센다 — 훅 내부 상태를 들여다보지 않으므로 같은 결함이
 * 다른 경로로 재발해도 잡힌다(tests/unit/card-detail-duplicate-requests.test.tsx 와 같은 방식).
 *
 * 타이머는 `shouldAdvanceTime: true` 로 둔다 — 실제 경과 시간만큼 가짜 시계도 흐르므로
 * RTL 의 findBy/waitFor 가 그대로 동작하고, 30초 tick 은 `advanceTimersByTimeAsync` 로 명시적으로
 * 앞당긴다. 임의 대기(sleep)로 통과시키지 않는다.
 */
const ME_ENDPOINT = "http://localhost/api/auth/me";
const NOTIFICATIONS_ENDPOINT = "http://localhost/api/notifications";
const POLL_MS = 30_000;

const VIEWER = {
  id: 1,
  email: "qa@example.com",
  displayName: "QA",
  roles: ["USER"],
  publicId: "44444444-4444-4444-8444-444444444444",
};

const FIRST_TITLE = "반도체 공급망 브리핑이 도착했어요";
const SECOND_TITLE = "금리 브리핑이 도착했어요";

const FIRST_PAGE = notificationList(3, [FIRST_TITLE]);
const SECOND_PAGE = notificationList(5, [SECOND_TITLE, FIRST_TITLE]);

function notificationList(unreadCount: number, titles: string[]): NotificationListDto {
  return {
    unreadCount,
    items: titles.map((title, index) => ({
      id: index + 1,
      type: "REPORT_READY",
      title,
      body: "본문",
      targetPath: "/report/11111111-1111-4111-8111-111111111111",
      read: false,
      createdAt: "2026-08-27T09:00:00Z",
    })),
  };
}

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, error: null });
}

function fail(status: number, code: string) {
  return HttpResponse.json(
    { success: false, data: null, error: { code, message: "server detail" } },
    { status },
  );
}

/** 응답을 임의 시점까지 붙잡아 두는 문(gate). 지연을 시간이 아니라 명시적 신호로 만든다. */
function createGate() {
  let open: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, release: () => open() };
}

/** 요청 수 카운터 + 응답 순서를 한 곳에서 정의한다(각 테스트가 필요한 응답만 넘긴다). */
function serveNotifications(respond: (call: number) => Promise<Response> | Response) {
  const counter = { calls: 0 };
  server.use(
    http.get(ME_ENDPOINT, () => ok(VIEWER)),
    http.get(NOTIFICATIONS_ENDPOINT, async () => {
      counter.calls += 1;
      return respond(counter.calls);
    }),
  );
  return counter;
}

/** 인증된 사용자로 렌더한다(토큰 존재 → AuthProvider 가 GET /api/auth/me 로 복구). */
function renderAuthenticated(ui: ReactElement) {
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "test-token");
  return renderWithProviders(ui);
}

/** 가짜 시계를 ms 만큼 앞당기고, 그로 인해 발생한 상태 갱신까지 반영한다. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** jsdom 의 document.hidden/visibilityState 를 덮어쓰고 visibilitychange 를 발생시킨다. */
function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

function restoreTabVisibility() {
  // defineProperty 로 얹은 own property 만 걷어내면 jsdom 원래 getter 가 그대로 되살아난다.
  const target = document as unknown as Record<string, unknown>;
  delete target.hidden;
  delete target.visibilityState;
}

/** 훅의 외부 반환 계약만 그대로 드러내는 최소 하네스(화면 디자인에 의존하지 않는다). */
function NotificationsProbe() {
  const notifications = useNotifications();
  const { logoutUser } = useAuth();
  return (
    <div>
      <span data-testid="status">{notifications.status}</span>
      <span data-testid="unread">
        {notifications.status === "success" ? String(notifications.data.unreadCount) : "-"}
      </span>
      <span data-testid="revalidating">
        {notifications.status === "success" && notifications.isRevalidating ? "yes" : "no"}
      </span>
      <span data-testid="error-code">
        {notifications.status === "error" ? (notifications.errorCode ?? "none") : "-"}
      </span>
      <button type="button" onClick={logoutUser}>
        로그아웃
      </button>
    </div>
  );
}

const bell = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  restoreTabVisibility();
});

describe("알림 배경 polling", () => {
  test("최초 조회 중에는 로딩을 보여주고, 성공하면 배지와 목록이 나타난다", async () => {
    const gate = createGate();
    const counter = serveNotifications(async () => {
      await gate.promise;
      return ok(FIRST_PAGE);
    });

    renderAuthenticated(<NotificationMenu />);

    // 인증이 확정돼 첫 조회가 시작된 상태(응답은 아직 붙잡혀 있다).
    await waitFor(() => expect(counter.calls).toBe(1));

    fireEvent.click(bell("알림"));
    expect(screen.getByText("알림을 불러오는 중…")).toBeInTheDocument();
    // 열기 refetch 는 진행 중 요청이 있어 건너뛴다(in-flight 락) → 요청이 늘지 않는다.
    expect(counter.calls).toBe(1);

    gate.release();

    expect(await screen.findByText(FIRST_TITLE)).toBeInTheDocument();
    expect(screen.queryByText("알림을 불러오는 중…")).not.toBeInTheDocument();
    expect(bell("알림 3개 읽지 않음")).toBeInTheDocument();
  });

  test("30초 배경 재조회 중에도 배지와 열린 목록이 그대로 유지된다", async () => {
    const first = createGate();
    const second = createGate();
    const counter = serveNotifications(async (call) => {
      if (call === 1) {
        await first.promise;
        return ok(FIRST_PAGE);
      }
      await second.promise;
      return ok(SECOND_PAGE);
    });

    renderAuthenticated(<NotificationMenu />);
    await waitFor(() => expect(counter.calls).toBe(1));

    // 첫 응답 전에 열어 둔다 — 열기 refetch 가 in-flight 락에 막혀 요청 수를 흐리지 않는다.
    fireEvent.click(bell("알림"));
    first.release();
    expect(await screen.findByText(FIRST_TITLE)).toBeInTheDocument();

    await advance(POLL_MS);

    // 여기가 예전 구현에서 깜빡이던 순간이다: 재조회가 시작됐지만 응답은 아직 오지 않았다.
    expect(counter.calls).toBe(2);
    expect(bell("알림 3개 읽지 않음")).toBeInTheDocument();
    expect(screen.getByText(FIRST_TITLE)).toBeInTheDocument();
    expect(screen.queryByText("알림을 불러오는 중…")).not.toBeInTheDocument();

    second.release();

    expect(await screen.findByText(SECOND_TITLE)).toBeInTheDocument();
    expect(bell("알림 5개 읽지 않음")).toBeInTheDocument();
  });

  test("30초가 지날 때마다 요청이 정확히 1회씩만 늘어난다", async () => {
    const counter = serveNotifications(() => ok(FIRST_PAGE));

    renderAuthenticated(<NotificationMenu />);
    expect(await screen.findByRole("button", { name: "알림 3개 읽지 않음" })).toBeInTheDocument();
    expect(counter.calls).toBe(1);

    await advance(25_000);
    expect(counter.calls).toBe(1); // 주기 전에는 요청하지 않는다

    await advance(10_000);
    expect(counter.calls).toBe(2);

    await advance(POLL_MS);
    expect(counter.calls).toBe(3);
  });

  test("숨김 탭에서는 시간이 지나도 요청이 추가되지 않는다", async () => {
    const counter = serveNotifications(() => ok(FIRST_PAGE));

    renderAuthenticated(<NotificationMenu />);
    expect(await screen.findByRole("button", { name: "알림 3개 읽지 않음" })).toBeInTheDocument();
    expect(counter.calls).toBe(1);

    setTabHidden(true);
    await advance(POLL_MS * 3);

    expect(counter.calls).toBe(1);
  });

  test("visible 로 돌아오면 즉시 1회 재조회하고 주기를 재개한다", async () => {
    const counter = serveNotifications(() => ok(FIRST_PAGE));

    renderAuthenticated(<NotificationMenu />);
    expect(await screen.findByRole("button", { name: "알림 3개 읽지 않음" })).toBeInTheDocument();

    setTabHidden(true);
    await advance(POLL_MS * 2);
    expect(counter.calls).toBe(1);

    // 시간을 앞당기지 않고 복귀만으로 1회 조회된다.
    setTabHidden(false);
    await waitFor(() => expect(counter.calls).toBe(2));

    await advance(POLL_MS);
    expect(counter.calls).toBe(3); // 주기 재개
  });

  test("응답이 느려도 다음 폴링 요청이 겹쳐 나가지 않는다", async () => {
    const slow = createGate();
    const counter = serveNotifications(async (call) => {
      if (call === 1) return ok(FIRST_PAGE);
      await slow.promise;
      return ok(SECOND_PAGE);
    });

    renderAuthenticated(<NotificationMenu />);
    expect(await screen.findByRole("button", { name: "알림 3개 읽지 않음" })).toBeInTheDocument();

    await advance(POLL_MS);
    expect(counter.calls).toBe(2); // 두 번째 요청이 아직 진행 중

    await advance(POLL_MS * 4);
    expect(counter.calls).toBe(2); // 진행 중인 동안에는 추가 요청이 없다

    slow.release();
    expect(await screen.findByRole("button", { name: "알림 5개 읽지 않음" })).toBeInTheDocument();

    await advance(POLL_MS);
    expect(counter.calls).toBe(3); // settle 이후 주기 재개
  });

  test("로그아웃해 비활성화되면 폴링이 즉시 멈춘다", async () => {
    const counter = serveNotifications(() => ok(FIRST_PAGE));

    renderAuthenticated(<NotificationsProbe />);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("success"));
    expect(counter.calls).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(screen.getByTestId("status")).toHaveTextContent("idle");

    await advance(POLL_MS * 3);
    expect(counter.calls).toBe(1);
  });

  test("언마운트 후에는 추가 요청이 발생하지 않는다", async () => {
    const counter = serveNotifications(() => ok(FIRST_PAGE));

    const view = renderAuthenticated(<NotificationMenu />);
    expect(await screen.findByRole("button", { name: "알림 3개 읽지 않음" })).toBeInTheDocument();
    expect(counter.calls).toBe(1);

    view.unmount();
    await advance(POLL_MS * 3);

    expect(counter.calls).toBe(1);
  });

  test("최초 조회가 실패하면 원인 코드를 보존한 error 상태가 된다", async () => {
    serveNotifications(() => fail(403, "FORBIDDEN"));

    renderAuthenticated(<NotificationsProbe />);

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("error"));
    expect(screen.getByTestId("error-code")).toHaveTextContent("FORBIDDEN");
  });

  test("성공 이후의 배경 조회가 실패해도 기존 데이터를 버리지 않는다", async () => {
    const counter = serveNotifications((call) =>
      call === 1 ? ok(FIRST_PAGE) : fail(500, "INTERNAL_ERROR"),
    );

    renderAuthenticated(<NotificationsProbe />);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("success"));
    expect(screen.getByTestId("unread")).toHaveTextContent("3");
    expect(screen.getByTestId("revalidating")).toHaveTextContent("no");

    await advance(POLL_MS);
    await waitFor(() => expect(counter.calls).toBe(2));

    expect(screen.getByTestId("status")).toHaveTextContent("success");
    expect(screen.getByTestId("unread")).toHaveTextContent("3");
    expect(screen.getByTestId("revalidating")).toHaveTextContent("no");
  });
});
