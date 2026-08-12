import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { CardDetailScreen } from "@/components/report/card-detail-screen";
import type { CardResponse } from "@/types/feed";
import type { ReportResponse } from "@/types/report";

import { server } from "../setup/msw-server";
import { renderWithProviders } from "../setup/render";

/**
 * 보고서(카드) 상세 — 조회 성공·실패 대표 테스트.
 *
 * 대상 선택 이유: `/report/{UUID}` 상세는 게스트에게 열려 있어(권한 = 내 카드 or PUBLIC)
 * **토큰·라우터를 흉내 내지 않고도** 실제 화면 컴포넌트를 그대로 렌더할 수 있는 유일한 P0 흐름이다.
 * 토큰이 없으면 AuthProvider 가 `/api/auth/me` 를 부르지 않고 바로 guest 로 확정하므로
 * 이 테스트가 거치는 네트워크는 상세가 실제로 쓰는 두 요청뿐이다.
 *
 * 검증 대상은 "사용자가 무엇을 보게 되는가"다 — 클래스명·내부 상태·소스 문자열은 보지 않는다.
 */
const CARD_ID = "11111111-1111-4111-8111-111111111111";
const REPORT_ID = "22222222-2222-4222-8222-222222222222";

const CARD_ENDPOINT = `http://localhost/api/cards/${CARD_ID}`;
const REPORT_ENDPOINT = `http://localhost/api/reports/${REPORT_ID}`;

/** 게스트가 볼 수 있는 공개 카드 1건 — 필드는 CardResponse 계약 그대로다. */
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
  sources: [{ title: "예시 출처", url: "https://example.com/article" }],
  createdAt: "2026-08-11T23:10:00Z",
};

/** 카드가 가리키는 본문 — 상세는 카드 요약 아래에 이 Markdown 을 렌더한다. */
const REPORT_BODY: ReportResponse = {
  publicId: REPORT_ID,
  title: PUBLIC_CARD.title,
  summary: PUBLIC_CARD.summary,
  body: "## 이번 주 요점\n\n장비 반입 일정이 2주 밀렸습니다.",
  citations: [{ title: "예시 출처", url: "https://example.com/article" }],
  createdAt: PUBLIC_CARD.createdAt,
};

/** 공통 응답 봉투(§3) — 성공. */
function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, error: null });
}

describe("보고서 상세 화면", () => {
  test("조회에 성공하면 보고서 제목과 본문을 보여준다", async () => {
    server.use(
      http.get(CARD_ENDPOINT, () => ok(PUBLIC_CARD)),
      http.get(REPORT_ENDPOINT, () => ok(REPORT_BODY)),
    );

    renderWithProviders(<CardDetailScreen publicId={CARD_ID} origin={{ token: "feed" }} />);

    // 로딩이 끝나면 사용자는 제목(문서 제목 수준의 heading)과 본문을 본다.
    expect(
      await screen.findByRole("heading", { level: 1, name: PUBLIC_CARD.title }),
    ).toBeInTheDocument();
    expect(await screen.findByText("장비 반입 일정이 2주 밀렸습니다.")).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_CARD.summary)).toBeInTheDocument();
  });

  test("조회에 실패하면 오류 안내와 다시 시도 버튼을 보여준다", async () => {
    server.use(
      http.get(CARD_ENDPOINT, () =>
        HttpResponse.json(
          {
            success: false,
            data: null,
            // 서버 원문 message 는 화면에 노출되지 않아야 한다(§2) — 아래에서 확인한다.
            error: { code: "INTERNAL_ERROR", message: "db connection refused" },
          },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<CardDetailScreen publicId={CARD_ID} origin={{ token: "feed" }} />);

    expect(await screen.findByText("카드를 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.queryByText(/db connection refused/)).not.toBeInTheDocument();
  });
});
