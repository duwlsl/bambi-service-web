import { toCardTags } from "@/lib/adapters/card";
import type { ScrapCard, ScrapTopicCount } from "@/types/scrap";

/**
 * 보관함(/scraps) 파생 집계 — 화면이 이미 가진 목록에서만 계산한다(별도 API 호출 없음).
 */

/**
 * rail "자주 저장한 주제" — `GET /api/scraps` 응답의 `tags` 만으로 빈도를 센다.
 *
 * 서버 계약: `ScrapCardResponse.tags` = `List.copyOf(card.interestTags)` 라 정상 응답에서는
 * null 이 아니라 빈 배열이다(발행 워커가 넣은 실제 관심사 태그). 그래서 여기서 만드는 값은
 * 전부 서버가 준 태그 원문이고, 제목·요약에서 주제를 추론하지 않는다(가짜 주제 금지).
 *
 * 정규화는 카드 태그 정규화의 단일 소스인 `toCardTags` 를 그대로 재사용한다 —
 * 공백 정리 + **카드 안에서** 대소문자 무시 중복 제거. 한 카드가 같은 주제를 두 번 세지 않는다.
 * 카드 사이 합산도 같은 기준(소문자 key)이라 "AI"·"ai" 가 두 줄로 갈라지지 않는다.
 *
 * **결과는 목록 순서에 의존하지 않는다.** 정렬은 건수 내림차순 + 동률 시 `localeCompare("ko")`,
 * 표기(label)는 "실제로 가장 많이 쓰인 원문"이고 그것마저 동률이면 다시 `localeCompare("ko")` 다.
 * 둘 다 Map 삽입 순서(= 응답 순서)를 쓰지 않는다: 그러면 같은 데이터를 다시 조회하거나 무관한
 * 카드를 하나 해제했을 때 순서·표기가 흔들린다(실제로 "AI" 가 "ai" 로 바뀌는 걸 QA 에서 확인).
 * 어느 쪽이든 **서버가 준 태그 원문 중 하나**이고, 표기를 임의로 만들거나 대소문자를 고치지 않는다.
 *
 * 태그가 하나도 없으면 **빈 배열**이다 — 호출부(rail)가 패널 자체를 렌더하지 않는다.
 */
export function topScrapTopics(cards: ScrapCard[], limit: number): ScrapTopicCount[] {
  // key(소문자) → 이 주제를 가진 카드 수 + 표기별 등장 횟수.
  const byKey = new Map<string, { count: number; spellings: Map<string, number> }>();

  for (const card of cards) {
    for (const tag of toCardTags(card.tags)) {
      const key = tag.toLowerCase();
      let entry = byKey.get(key);
      if (entry === undefined) {
        entry = { count: 0, spellings: new Map() };
        byKey.set(key, entry);
      }
      entry.count += 1;
      entry.spellings.set(tag, (entry.spellings.get(tag) ?? 0) + 1);
    }
  }

  return [...byKey.entries()]
    .map(([key, { count, spellings }]) => ({ key, count, label: dominantSpelling(spellings) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"))
    .slice(0, Math.max(0, limit));
}

/** 가장 많이 쓰인 표기. 동률이면 `localeCompare("ko")` 로 고정한다(둘 다 서버 원문이다). */
function dominantSpelling(spellings: Map<string, number>): string {
  return [...spellings.entries()].reduce((best, cur) =>
    cur[1] > best[1] || (cur[1] === best[1] && cur[0].localeCompare(best[0], "ko") < 0) ? cur : best,
  )[0];
}
