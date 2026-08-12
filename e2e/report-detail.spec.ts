import { expect, test, type Page } from "@playwright/test";

/**
 * 핵심 흐름 E2E — 홈 피드 → 보고서 카드 클릭 → 보고서 상세.
 *
 * 게스트로 도는 이유: 홈 `/` 와 상세 `/report/{UUID}` 는 공개 화면이라(CLAUDE.md §5) 토큰 없이
 * 실제 사용자 경로를 그대로 밟을 수 있다. 서비스 소스에 테스트용 인증 우회를 넣지 않기 위한
 * 선택이기도 하다 — 로그인 흐름 E2E 는 이 PR 범위 밖이다.
 *
 * 모든 API 는 stub 한다. 등록하지 않은 `/api/**` 요청은 abort 되어 조용히 실서버로 새지 않는다.
 */
const CARD_ID = "11111111-1111-4111-8111-111111111111";
const REPORT_ID = "22222222-2222-4222-8222-222222222222";

const CARD_TITLE = "반도체 공급망에 생긴 이번 주 변화";
const CARD_SUMMARY = "장비 반입 지연이 이번 분기 출하 계획에 미치는 영향 요약.";
const REPORT_BODY_LINE = "장비 반입 일정이 2주 밀렸습니다.";

const AUTHOR = {
  publicId: "33333333-3333-4333-8333-333333333333",
  username: "bambi",
  displayName: "밤비",
};

/** 공통 응답 봉투(§3) 성공 형태로 감싼다. */
function envelope(data: unknown) {
  return { status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data, error: null }) };
}

/**
 * API 격리. Playwright 는 나중에 등록한 route 를 먼저 검사하므로,
 * **catch-all 을 가장 먼저 등록**하고 구체 경로를 뒤에 등록한다.
 */
async function stubApi(page: Page) {
  await page.route("**/api/**", (route) => route.abort());

  await page.route("**/api/feed/public**", (route) =>
    route.fulfill(
      envelope([
        {
          publicId: CARD_ID,
          title: CARD_TITLE,
          summary: CARD_SUMMARY,
          whyForYou: "저장하신 반도체 자료와 겹치는 주제예요.",
          tags: [],
          coverImage: null,
          author: AUTHOR,
          likeCount: 3,
          liked: false,
          scrapped: false,
          sources: [{ title: "예시 출처", url: "https://example.com/article" }],
          createdAt: "2026-08-11T23:10:00Z",
        },
      ]),
    ),
  );

  await page.route(`**/api/cards/${CARD_ID}`, (route) =>
    route.fulfill(
      envelope({
        publicId: CARD_ID,
        reportId: REPORT_ID,
        title: CARD_TITLE,
        summary: CARD_SUMMARY,
        whyForYou: "저장하신 반도체 자료와 겹치는 주제예요.",
        visibility: "PUBLIC",
        author: AUTHOR,
        likeCount: 3,
        liked: false,
        scrapped: false,
        sources: [{ title: "예시 출처", url: "https://example.com/article" }],
        createdAt: "2026-08-11T23:10:00Z",
      }),
    ),
  );

  await page.route(`**/api/reports/${REPORT_ID}`, (route) =>
    route.fulfill(
      envelope({
        publicId: REPORT_ID,
        title: CARD_TITLE,
        summary: CARD_SUMMARY,
        body: `## 이번 주 요점\n\n${REPORT_BODY_LINE}`,
        citations: [{ title: "예시 출처", url: "https://example.com/article" }],
        createdAt: "2026-08-11T23:10:00Z",
      }),
    ),
  );
}

test("홈 피드에서 카드를 누르면 보고서 상세가 열린다", async ({ page }) => {
  await stubApi(page);

  await page.goto("/");

  // 피드에 카드가 뜬 뒤, 사용자가 실제로 누르는 제목 링크를 클릭한다.
  // exact 를 주는 이유: 같은 카드에 "더 보기 — {제목}" 링크가 하나 더 있어 부분 일치로는 둘이 잡힌다.
  const cardLink = page.getByRole("link", { name: CARD_TITLE, exact: true });
  await expect(cardLink).toBeVisible();
  await cardLink.click();

  await expect(page).toHaveURL(new RegExp(`/report/${CARD_ID}`));
  await expect(page.getByRole("heading", { level: 1, name: CARD_TITLE })).toBeVisible();
  await expect(page.getByText(REPORT_BODY_LINE)).toBeVisible();
});
