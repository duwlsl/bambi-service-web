/**
 * 관심도 단계 — 임계값 · 라벨 · 막대 색을 정하는 **단일 소스**.
 *
 * 값의 정체(서버 실측):
 *   `WikiTag.score` 는 `GET /api/wiki/tags` 가 주는 **0~1 상대 강도**다
 *   (bambi-service-api `WikiTag.java` 주석: "score 는 0~1 상대 강도(음수 없음)").
 *   agent 는 후보별 가중치를 계산한 뒤 **그 사용자 안에서 최고 가중치를 1.0 으로 재정규화**한다
 *   (bambi-agent-api `domain/interests/features/scoring.py` INT-005: `weight / max_weight`).
 *   → 절대 점수가 아니라 **"내 관심사 중 가장 강한 것 대비 얼마나 강한가"** 다.
 *     사용자 간 비교도, 시간에 따른 절대 증감 판단도 이 값으로 할 수 없다.
 *
 * 그래서 단계는 0~1 을 4등분한 **고정 임계값**으로 나눈다. 값 자체가 이미 상대 척도라
 * 화면에서 항목끼리 다시 순위를 매기거나(상위 N%) 분포에 맞춰 늘리지 않는다 —
 * 그러면 같은 점수가 목록 구성에 따라 다른 단계로 보인다.
 *
 * ⚠ 라벨은 **관심도 크기**만 말한다. score 계산에 최신성 감쇠가 섞여 있긴 하지만
 * 응답이 내려주는 것은 합산된 강도 하나뿐이라, "꾸준한"·"잠시 쉬는 중" 같은
 * 시간·활동 문구는 이 값으로 뒷받침되지 않는다(목업 wiki.html 문구를 쓰지 않는 이유).
 * 비활성 상태를 나타내는 필드도 계약에 없으므로 회색 단계를 두지 않는다.
 */

export type InterestLevel = "veryHigh" | "high" | "medium" | "low";

/**
 * 단계별 score 하한(이상). 0~1 균등 4분할.
 * 상위 단계부터 순서대로 비교하므로 값이 겹치지 않게 유지한다.
 */
export const INTEREST_LEVEL_MIN_SCORE: Record<InterestLevel, number> = {
  veryHigh: 0.75,
  high: 0.5,
  medium: 0.25,
  low: 0,
};

/** 화면 라벨 — 중립적인 크기 표현만 쓴다(시간·최근 활동 암시 금지). */
export const INTEREST_LEVEL_LABEL: Record<InterestLevel, string> = {
  veryHigh: "매우 높음",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

/**
 * 막대 채움 색 — 브랜드 주황(`--primary`) **한 계열의 농도 4단계**.
 * 새 색 토큰을 만들지 않고 기존 토큰의 알파만 달리한다(목업 .mrow .mbar 도 --signal 의 opacity 로 구분한다).
 * 가장 옅은 `low` 도 막대 트랙(`bg-background`) 위에서 색이 구분되도록 25% 이상을 유지한다 —
 * 라이트(#F5F6F8 트랙)에서는 살구색, 다크(#20242C 트랙)에서는 갈빛으로 트랙과 갈린다.
 */
export const INTEREST_LEVEL_BAR_CLASS: Record<InterestLevel, string> = {
  veryHigh: "bg-primary",
  high: "bg-primary/70",
  medium: "bg-primary/45",
  low: "bg-primary/25",
};

/**
 * score → 단계. **점수 없음(null)과 0 은 다르다**:
 * - `null` = 서버가 관심도를 준 적이 없는 항목(직접 추가만 한 관심사) → `null` 을 돌려주고
 *   호출부는 막대·색·라벨을 만들지 않는다.
 * - `0` = 서버가 실제로 준 값 → 정상적으로 최하 단계(`low`)다.
 */
export function resolveInterestLevel(score: number | null): InterestLevel | null {
  if (score === null || !Number.isFinite(score)) return null;
  if (score >= INTEREST_LEVEL_MIN_SCORE.veryHigh) return "veryHigh";
  if (score >= INTEREST_LEVEL_MIN_SCORE.high) return "high";
  if (score >= INTEREST_LEVEL_MIN_SCORE.medium) return "medium";
  return "low";
}

/**
 * score → 막대 폭(%). 서버 값을 그대로 쓰고 차이를 키우거나 줄이지 않는다.
 * 최소 폭 8% 는 기존 규칙 그대로 — 0 에 가까워도 막대가 사라져 "값이 없는 행"처럼 보이지 않게 한다.
 */
export function interestBarWidthPercent(score: number): number {
  return Math.max(8, Math.round(score * 100));
}
