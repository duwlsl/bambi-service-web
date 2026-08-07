/**
 * 스크랩 도메인 타입 (07-31 실측 기반).
 * 백엔드: GET /api/scraps · POST/DELETE /api/cards/{publicId}/scrap (전부 인증 필요)
 * 스크랩 = 남의 공개(PUBLIC) 카드 담기. 내 관심 자료 저장(bookmarks)과 다른 개념(§CLAUDE.md).
 */

/** GET /api/scraps 목록 항목 — 담아둔 공개 카드의 요약·태그·작성자. */
export type ScrapCard = {
  publicId: string;
  title: string;
  summary: string;
  tags: string[];
  author: { publicId: string | null; username: string | null; displayName: string | null };
  createdAt: string;
};

/** POST/DELETE /api/cards/{publicId}/scrap 의 data — 확정된 내 스크랩 상태. */
export type ScrapData = {
  scrapped: boolean;
};

/**
 * rail "자주 저장한 주제" 한 줄 — **별도 API 없이** 현재 보관 목록(ScrapCard[])의 tags 에서만
 * 파생한 집계값이다(홈 rail 의 MyReportsSummary 와 같은 규율 — 중복 조회 금지).
 *
 * `label` 과 `key` 를 나눠 갖는 이유: 같은 주제의 대소문자 표기 차이("AI"·"ai")를 하나로 세되
 * 화면 표기는 서버가 준 첫 유효 값을 그대로 유지한다(태그 원문을 임의로 바꾸지 않는다).
 */
export type ScrapTopicCount = {
  /** 표시용 태그 원문(공백 정리만). */
  label: string;
  /** 대소문자 무시 비교 키 — 집계·React key 용. 화면에 노출하지 않는다. */
  key: string;
  /** 이 주제를 가진 보관 카드 수. 실제 카드 수이며 보정하지 않는다. */
  count: number;
};
