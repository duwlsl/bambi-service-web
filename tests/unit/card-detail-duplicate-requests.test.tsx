import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { CardDetailScreen } from "@/components/report/card-detail-screen";
import { ACCESS_TOKEN_STORAGE_KEY } from "@/constants/auth";
import type { CardResponse } from "@/types/feed";
import type { ReportResponse } from "@/types/report";

import { server } from "../setup/msw-server";
import { renderWithProviders } from "../setup/render";

/**
 * 보고서 상세 진입당 알림 조회 횟수 — 중복 읽기 요청 회귀 방지(2026-08-13, 여진).
 *
 * 결함: 상세 화면이 상태별로 **서로 다른 컴포넌트를 루트로 반환**했다(로딩 `DetailSkeleton` →
 * 성공 `CardDetailView`). 각 갈래가 자기 안에서 HomeNav 를 렌더했기 때문에, 카드 응답이 도착해
 * 갈래가 바뀌는 순간 React 가 헤더 하위 트리를 통째로 unmount 후 다시 mount 했고, 헤더에 달린
 * 알림 드롭다운(useNotifications)이 다시 조회를 시작해 **화면 진입 한 번에 GET /api/notifications
 * 가 2회** 나갔다. 로컬 production build 에서도 재현됐다(dev StrictMode 전용 현상이 아니다).
 *
 * 검증 방식: 요청 횟수를 **네트워크 경계에서** 센다(MSW). 훅 내부 상태·mount 횟수를 들여다보지
 * 않으므로, 같은 결함이 다른 경로로 재발해도 이 테스트가 잡는다.
 *
 * ⚠️ 이 테스트는 "총 1회"를 고정하는 게 아니라 **진입 전환 때문에 늘어나지 않는다**를 고정한다.
 * 30초 polling·수동 재시도 같은 정상 재조회는 여기서 시간이 흐르지 않아 발생하지 않는다.
 */
const CARD_ID = "11111111-1111-4111-8111-111111111111";
const REPORT_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "44444444-4444-4444-8444-444444444444";

const ME_ENDPOINT = "http://localhost/api/auth/me";
const CARD_ENDPOINT = `http://localhost/api/cards/${CARD_ID}`;
const COMMENTS_ENDPOINT = `http://localhost/api/cards/${CARD_ID}/comments`;
const REPORT_ENDPOINT = `http://localhost/api/reports/${REPORT_ID}`;
const NOTIFICATIONS_ENDPOINT = "http://localhost/api/notifications";

const PUBLIC_CARD: CardResponse = {
  publicId: CARD_ID,
  reportId: REPORT_ID,
  title: "반도체 공급망에 생긴 이번 주 변화",
  summary: "장비 반입 지연이 이번 분기 출하 계획에 미치는 영향 요약.",
  whyForYou: "저장하신 반도체 자료와 겹치는 주제예요.",
  visibility: "PUBLIC",
  author: { publicId: "33333333-3333-4333-8333-333333333333", username: "bambi", displayName: "밤비" },
  likeCount: 3,
  liked: false,
  scrapped: false,
  sources: [],
  createdAt: "2026-08-11T23:10:00Z",
};

const REPORT_BODY: ReportResponse = {
  publicId: REPORT_ID,
  title: PUBLIC_CARD.title,
  summary: PUBLIC_CARD.summary,
  body: "## 이번 주 요점\n\n장비 반입 일정이 2주 밀렸습니다.",
  citations: [],
  createdAt: PUBLIC_CARD.createdAt,
};

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, error: null });
}

describe("보고서 상세 — 화면 진입당 알림 조회 횟수", () => {
  test("로딩에서 상세로 바뀌어도 GET /api/notifications 는 1회만 나간다", async () => {
    // 로그인 사용자여야 알림을 조회한다(useNotifications 는 authenticated 에서만 enabled).
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "test-token");

    let notificationCalls = 0;
    /*
      카드 응답을 **인증 확정보다 늦게** 돌려준다 — 실제 진입 순서를 그대로 만든다:
      인증 확정(헤더가 알림 조회 시작) → 그 뒤 카드 도착(로딩 갈래 → 상세 갈래 전환).
      이 순서가 아니면 전환 자체가 관찰되지 않아 결함이 재현되지 않는다.
    */
    let releaseCard: () => void = () => {};
    const cardGate = new Promise<void>((resolve) => {
      releaseCard = resolve;
    });

    server.use(
      http.get(ME_ENDPOINT, () =>
        ok({ id: 1, email: "qa@example.com", displayName: "QA", roles: ["USER"], publicId: VIEWER_ID }),
      ),
      http.get(NOTIFICATIONS_ENDPOINT, () => {
        notificationCalls += 1;
        return ok({ items: [], unreadCount: 0 });
      }),
      http.get(CARD_ENDPOINT, async () => {
        await cardGate;
        return ok(PUBLIC_CARD);
      }),
      http.get(REPORT_ENDPOINT, () => ok(REPORT_BODY)),
      http.get(COMMENTS_ENDPOINT, () => ok({ items: [], totalCount: 0 })),
    );

    renderWithProviders(<CardDetailScreen publicId={CARD_ID} origin={{ token: "feed" }} />);

    // 1) 인증이 확정돼 헤더가 알림을 한 번 조회한 상태 — 아직 카드는 로딩 중이다.
    await waitFor(() => expect(notificationCalls).toBe(1));

    // 2) 카드 응답 도착 → 화면이 로딩 갈래에서 상세 갈래로 전환된다.
    releaseCard();
    expect(
      await screen.findByRole("heading", { level: 1, name: PUBLIC_CARD.title }),
    ).toBeInTheDocument();

    // 3) 그 전환이 헤더를 다시 mount 시키지 않는다 → 두 번째 알림 조회가 없다.
    await waitFor(() => expect(screen.getByText("장비 반입 일정이 2주 밀렸습니다.")).toBeInTheDocument());
    expect(notificationCalls).toBe(1);
  });
});
