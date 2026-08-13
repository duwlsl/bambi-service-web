import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { FeedRec } from "@/components/home/feed-rec";
import { ACCESS_TOKEN_STORAGE_KEY } from "@/constants/auth";
import type { User } from "@/types/auth";
import type { PublicFeedCardResponse } from "@/types/feed";

import { server } from "../setup/msw-server";
import { renderWithProviders } from "../setup/render";

/**
 * 홈 [피드] 공개 피드 — 개인화 결과가 0건일 때의 Empty 결함.
 *
 * 결함: 로그인 사용자는 팔로잉·추천을 섞어 목록을 만드는데, 팔로잉 0건 + 추천 후보 0건이면 혼합
 * 결과가 빈 배열이라 **볼 수 있는 공개 카드가 있는데도** Empty 가 떴다(게스트에게는 같은 카드가
 * 정상적으로 보인다). 이제 그 경우에만 게스트와 같은 목록(`following=false` 응답)을 그대로 쓴다.
 *
 * 훅 내부를 들여다보지 않고 실제 컴포넌트가 그린 결과(카드 제목 h3 · Empty 문구)로만 확인한다 —
 * 사용자가 실제로 보게 되는 것이 검증 대상이기 때문이다.
 */
const ME_ENDPOINT = "http://localhost/api/auth/me";
const PUBLIC_FEED_ENDPOINT = "http://localhost/api/feed/public";

const EMPTY_TITLE = "지금 보여드릴 공개 브리핑이 없어요";

const ME: User = {
  id: 1,
  email: "qa@bambi.test",
  displayName: "밤비",
  roles: ["USER"],
};

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, error: null });
}

/** 어댑터가 UUID 형식만 통과시키므로(죽은 링크 방지) 카드 id 는 형식을 지켜 만든다. */
function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

/**
 * 공개 피드 카드 1건. `matched` 가 true 면 서버가 뷰어 기준 매칭을 표시한 카드 = 추천 후보다
 * (판정은 서버 값만 본다 — lib/feed-mix.ts isRecommendedCandidate).
 */
function card(
  n: number,
  title: string,
  { matched = false }: { matched?: boolean } = {},
): PublicFeedCardResponse {
  return {
    publicId: uuid(n),
    title,
    summary: "",
    whyForYou: "",
    author: { publicId: null, username: null, displayName: null },
    likeCount: 0,
    liked: false,
    matchedTopics: matched ? [{ topicId: "ai", name: "AI" }] : [],
    matchedCategories: [],
    sources: [],
    createdAt: "2026-08-13T00:00:00Z",
  };
}

/**
 * 두 범위를 같은 엔드포인트에서 쿼리로 갈라 응답한다(훅이 실제로 보내는 요청 그대로).
 * 호출된 범위를 기록해 "게스트는 팔로잉을 조회하지 않는다"까지 함께 확인한다.
 */
function serveFeed(scopes: { following: PublicFeedCardResponse[]; all: PublicFeedCardResponse[] }) {
  const requested: string[] = [];
  server.use(
    http.get(PUBLIC_FEED_ENDPOINT, ({ request }) => {
      const following = new URL(request.url).searchParams.get("following") === "true";
      requested.push(following ? "following" : "all");
      return ok(following ? scopes.following : scopes.all);
    }),
  );
  return requested;
}

/** 토큰 + /me 로 로그인 상태를 만든다(가짜 provider 없이 실제 인증 복구 경로를 그대로 탄다). */
function signIn() {
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "test-token");
  server.use(http.get(ME_ENDPOINT, () => ok(ME)));
}

/** 렌더된 카드 제목을 화면 순서 그대로 — 목록의 정렬까지 함께 본다. */
function renderedTitles(): string[] {
  return screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent ?? "");
}

describe("공개 피드 — 개인화 결과 0건 fallback", () => {
  test("비로그인은 전체 공개 목록을 그대로 보여준다(팔로잉은 조회하지 않는다)", async () => {
    const requested = serveFeed({
      following: [],
      all: [card(1, "공개 카드 1"), card(2, "공개 카드 2")],
    });

    renderWithProviders(<FeedRec />);

    expect(await screen.findByText("공개 카드 1")).toBeInTheDocument();
    expect(renderedTitles()).toEqual(["공개 카드 1", "공개 카드 2"]);
    expect(requested).toEqual(["all"]);
  });

  test("로그인 + 팔로잉 0 + 추천 후보 0 이면 게스트와 같은 전체 공개 목록을 보여준다", async () => {
    signIn();
    serveFeed({
      following: [],
      // 매칭 표시가 없는 카드 = 추천 후보 아님 → 예전에는 혼합 결과가 0건이라 Empty 가 떴다.
      all: [card(1, "공개 카드 1"), card(2, "공개 카드 2")],
    });

    renderWithProviders(<FeedRec />);

    expect(await screen.findByText("공개 카드 1")).toBeInTheDocument();
    expect(renderedTitles()).toEqual(["공개 카드 1", "공개 카드 2"]);
    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument();
  });

  test("추천 후보가 있으면 기존 혼합 결과와 순서를 그대로 유지한다", async () => {
    signIn();
    serveFeed({
      following: [card(1, "팔로잉 1"), card(2, "팔로잉 2"), card(3, "팔로잉 3")],
      all: [
        card(9, "비매칭 공개"), // 추천 후보가 아니므로 목록에 들어가지 않는다(가짜 추천 금지)
        card(4, "추천 1", { matched: true }),
        card(5, "추천 2", { matched: true }),
      ],
    });

    renderWithProviders(<FeedRec />);

    expect(await screen.findByText("팔로잉 1")).toBeInTheDocument();
    // 팔로잉 2 : 추천 1 교차 배치가 그대로다.
    expect(renderedTitles()).toEqual(["팔로잉 1", "팔로잉 2", "추천 1", "팔로잉 3", "추천 2"]);
    expect(screen.queryByText("비매칭 공개")).not.toBeInTheDocument();
  });

  test("팔로잉만 있고 추천 후보가 0 이면 팔로잉만 보여준다(공개 카드로 빈자리를 채우지 않는다)", async () => {
    signIn();
    serveFeed({
      following: [card(1, "팔로잉 1")],
      all: [card(9, "비매칭 공개")],
    });

    renderWithProviders(<FeedRec />);

    expect(await screen.findByText("팔로잉 1")).toBeInTheDocument();
    expect(renderedTitles()).toEqual(["팔로잉 1"]);
    expect(screen.queryByText("비매칭 공개")).not.toBeInTheDocument();
  });

  test("공개 카드도 0건이면 기존 Empty 상태를 유지한다", async () => {
    signIn();
    serveFeed({ following: [], all: [] });

    renderWithProviders(<FeedRec />);

    expect(await screen.findByText(EMPTY_TITLE)).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });
});
