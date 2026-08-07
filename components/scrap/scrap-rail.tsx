"use client";

import { topScrapTopics } from "@/lib/adapters/scrap";
import type { ScrapCard } from "@/types/scrap";

/**
 * /scraps 우측 rail — 목업 saved.html 의 `.side-r` 복원.
 *
 * 목업 rail 패널 2개 중 **「자주 저장한 주제」만** 구현한다.
 *
 * - 「자주 저장한 주제」: 화면이 이미 가진 보관 목록(`GET /api/scraps`)의 `tags` 실측 집계다.
 *   rail 때문에 API 를 다시 부르지 않고, 표시되는 목록(보관 해제분 제외)과 항상 같은 모수를 쓴다.
 * - 「추천 보고서」: **구현하지 않는다.** 서버에 추천 계약이 없다 — bambi-service-api 에 추천/인기
 *   엔드포인트가 없고, `GET /api/feed/public` 은 파라미터가 `following`·`limit` 뿐인 `createdAt desc`
 *   목록이라 추천 점수·추천 사유가 존재하지 않는다(types/feed.ts: "개인화 랭킹이 아니다").
 *   최신·좋아요·랜덤을 "추천"이라고 부르면 근거 없는 추천을 만드는 것이라, skeleton·Coming soon
 *   같은 자리표시 UI 도 두지 않고 계약이 생길 때까지 비워 둔다.
 *
 * 디자인: handoff `product-components.css` 의 `.rpanel`(bg-card·border·radius 14·px-4 py-[15px]) ·
 * `.rpanel h4`(13px/700) · `.sv-int`(13px ink-mid, 행 구분선, 마지막 행 선 없음) ·
 * `.n2`(12px ink-dim, 우측 정렬) 을 현재 디자인 시스템 토큰으로 옮긴 것이다.
 *
 * 300px 폭 · sticky · 1240px 미만 숨김은 다른 rail(홈·/reports·/notifications)과 같은 정책이다.
 * 이 패널은 **본문 카드에 이미 보이는 태그의 요약**이라 숨겨져도 접근 가능한 정보가 사라지지 않는다
 * (좁은 화면에서는 카드마다 붙은 태그가 그대로 남는다).
 *
 * 목업의 주제 클릭 필터(`data-svint`)는 만들지 않는다 — 현재 /scraps 에 목록 검색·필터 기능이
 * 없어서(이번 범위 밖) 눌러도 아무 일이 없는 컨트롤이 된다. 읽기 전용 텍스트로 둔다.
 */

/** 노출 개수 — 목업 `.sv-int` 실제 행 수(4)와 동일. */
const TOPIC_LIMIT = 4;

export function ScrapRail({ cards }: { cards: ScrapCard[] }) {
  const topics = topScrapTopics(cards, TOPIC_LIMIT);

  // 보관 0건이거나 태그가 하나도 없으면 패널을 만들지 않는다 — 0 으로 채운 가짜 목록 금지.
  // rail 에 남는 패널이 없으므로 aside 자체를 렌더하지 않는다(빈 300px 칼럼을 남기지 않는다).
  if (topics.length === 0) return null;

  return (
    <aside
      aria-label="보관함 요약"
      className="sticky top-4 flex w-[300px] shrink-0 flex-col gap-3.5 max-[1240px]:hidden"
    >
      <section className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
        <h2 className="mb-2.5 text-[13px] font-bold text-foreground">자주 저장한 주제</h2>
        <ul>
          {topics.map((topic) => (
            <li
              key={topic.key}
              className="flex items-center justify-between gap-3 border-b border-border py-2 text-[13px] text-ink-mid last:border-b-0 last:pb-px"
            >
              <span className="min-w-0 truncate">{topic.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {topic.count}
                <span className="sr-only">건</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
