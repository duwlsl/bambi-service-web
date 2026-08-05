/**
 * 카드 댓글 API 타입 (bambi-service-api `comment/` 실측 · 확인일 2026-08-05, service-api PR #36).
 *
 *   GET    /api/cards/{publicId}/comments              → CommentResponse[] (오래된 순)
 *   POST   /api/cards/{publicId}/comments              → 201 CommentResponse
 *   DELETE /api/cards/{publicId}/comments/{commentId}  → 200 (본문 없음)
 *
 * 공통 정책(CommentService 실측):
 * - **PUBLIC 카드만** 댓글 대상. 형식 오류·부재·PRIVATE 는 전부 404 NOT_FOUND 로 통일된다
 *   (존재 노출 없음 — 좋아요·스크랩과 같은 규율).
 * - 목록·작성·삭제 **모두 인증 필수**. `/api/cards/*` permitAll 은 한 세그먼트만 매칭하므로
 *   `/api/cards/{id}/comments` 는 `anyRequest().authenticated()` 로 떨어진다(2026-08-05 실측 401).
 * - 삭제는 작성자 본인만(soft delete). 남의 댓글·없는 댓글·이미 삭제된 댓글은 404.
 *   카드 공개 여부와 무관하다(비공개로 바뀌어도 내 댓글은 지울 수 있다).
 */

/**
 * 댓글 작성자 요약 — 서버 `CommentResponse.AuthorResponse` 1:1.
 * `AuthorResponse.from(null)` 경로가 있어 **세 필드가 동시에 null 일 수 있다**(탈퇴·부재 작성자).
 */
export type CommentAuthorDto = {
  publicId: string | null;
  username: string | null;
  displayName: string | null;
};

/**
 * 댓글 1건(API DTO) — 서버 record 와 같은 모양.
 * `id` 는 삭제 대상 지정용 순번(Long). 대외 식별자가 아니라 댓글 경로 파라미터로만 쓴다.
 * 타입은 계약을 그대로 적고, 값 신뢰는 어댑터/훅의 런타임 검증이 담당한다.
 */
export type CommentDto = {
  id: number;
  content: string;
  author: CommentAuthorDto;
  createdAt: string; // ISO-8601 (서버 OffsetDateTime)
};

/** POST 요청 body. content 는 서버가 strip 후 저장하며 1~1000자(@NotBlank @Size(max=1000)). */
export type CreateCommentRequest = {
  content: string;
};

/** 서버 계약의 content 최대 길이 — CommentRequest @Size(max=1000) 실측. */
export const COMMENT_MAX_LENGTH = 1000;

/**
 * 댓글 화면 모델 — 실제로 렌더할 값만.
 * DTO 의 nullable 을 화면이 다시 판단하지 않도록 어댑터가 미리 좁힌다.
 */
export type CommentVM = {
  /** 삭제 요청에 쓰는 서버 id. */
  id: number;
  /** 렌더할 본문(공백 정리). 빈 댓글은 어댑터가 제외한다. */
  content: string;
  /** displayName → username 순의 실제 이름. 둘 다 없으면 null → 화면이 중립 문구를 쓴다. */
  authorName: string | null;
  /** 아바타용 첫 글자. authorName 이 없으면 null(가짜 이니셜 금지). */
  authorInitial: string | null;
  /** UUID 로 검증된 값만. null 이면 프로필 링크를 만들지 않는다. */
  authorPublicId: string | null;
  /** 파싱 실패 시 빈 문자열 — 화면은 빈 값이면 시각 줄을 생략한다(Invalid Date 노출 금지). */
  createdAtLabel: string;
};
