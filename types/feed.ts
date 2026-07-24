/**
 * 피드·저장 API 계약 타입 (bambi-service-api 실측 · 검증일 2026-07-23).
 *
 *   GET  /api/feed      → ApiResponse<CardResponse[]>            (인증, 최신순, 신규계정은 [])
 *   POST /api/bookmarks → 201 ApiResponse<{ bookmark, card }>   (인증)
 *
 * 원칙: API DTO(CardResponse)와 화면 모델(FeedCardVM)을 분리한다. 백엔드가 주지 않는 값
 * (작성자·좋아요·댓글·태그·saved·visibility 등)은 만들지 않는다.
 */

/** 카드 출처 1건. */
export type CardSource = {
  title: string;
  url: string;
};

/**
 * 카드 응답 DTO — GET /api/feed 항목이자 POST /api/bookmarks 응답의 card.
 * 대외 식별자는 publicId(UUID)만 노출한다(내부 순번 id 없음).
 */
export type CardResponse = {
  publicId: string;
  title: string;
  summary: string;
  whyForYou: string;
  sources: CardSource[];
  createdAt: string; // ISO-8601 (서버 OffsetDateTime)
};

/**
 * POST /api/bookmarks 요청 body. url·content 중 최소 하나 필수(서버 검증),
 * title 선택. 서버 길이 제한: url ≤ 2048, title ≤ 500.
 */
export type CreateBookmarkRequest = {
  url?: string;
  title?: string;
  content?: string;
};

/**
 * POST /api/bookmarks 성공(201) data. 이번 범위에서는 card 만 사용하고
 * bookmark 내부 구조는 해석하지 않는다(unknown 유지).
 */
export type BookmarkCreateData = {
  bookmark: unknown;
  card: CardResponse;
};

/**
 * 화면 카드 모델 — DTO에서 화면이 필요한 값만 옮긴 것. 어댑터(lib/adapters/card.ts)가 변환한다.
 * createdAt 은 표시용 문자열(createdAtLabel)로만 가진다.
 */
export type FeedCardVM = {
  publicId: string;
  title: string;
  summary: string;
  whyForYou: string;
  sources: CardSource[];
  createdAtLabel: string;
};
