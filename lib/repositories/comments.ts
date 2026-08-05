import { FALLBACK_ERROR_CODE } from "@/constants/errors";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api-client";
import type { CommentDto, CreateCommentRequest } from "@/types/comments";

/**
 * 카드 댓글 repository — 화면 훅과 Service API 사이의 단일 seam.
 * 컴포넌트는 이 함수만 쓰고 `fetch`·api-client 를 직접 호출하지 않는다(CLAUDE.md §1).
 *
 * 실측 계약(service-api `comment/`, 확인일 2026-08-05 · PR #36) — 자세한 정책은 types/comments.ts 참조:
 *   GET    /api/cards/{publicId}/comments             (인증) → 오래된 순 배열
 *   POST   /api/cards/{publicId}/comments             (인증) → 201 + 생성된 댓글
 *   DELETE /api/cards/{publicId}/comments/{commentId} (인증) → 200
 *
 * Bearer 부착·envelope 해석·AUTH_INVALID_TOKEN 처리는 공통 client 가 한다(§3·§5).
 * 훅이 authenticated 에서만 호출하므로 여기서 인증 상태를 다시 판단하지 않는다.
 * 존재하지 않는 endpoint(댓글 수 집계 등)를 추측해 만들지 않는다.
 */

/**
 * 댓글 경로 — cardPublicId 는 서버가 UUID 로 파싱하고 형식 오류를 404 로 돌려준다.
 * 그래도 경로에 그대로 끼워 넣지 않고 인코딩해 URL 구조가 깨지지 않게 한다.
 */
function commentsPath(cardPublicId: string): string {
  return `/api/cards/${encodeURIComponent(cardPublicId)}/comments`;
}

/**
 * 댓글 목록 — 서버가 주는 **오래된 순** 그대로 반환한다(프론트에서 재정렬하지 않는다).
 * 정상 빈 배열(댓글 0건)은 오류가 아니라 Empty 다 → 호출부가 구분한다.
 * 배열이 아니면 계약 위반이므로 ApiError 로 올려 Empty 로 위장하지 않는다.
 */
export async function fetchComments(
  cardPublicId: string,
  signal?: AbortSignal,
): Promise<CommentDto[]> {
  const path = commentsPath(cardPublicId);
  const data = await apiGet<CommentDto[] | null>(path, { signal });
  if (!Array.isArray(data)) {
    throw new ApiError(FALLBACK_ERROR_CODE, `invalid comments payload for ${path}`, 200);
  }
  return data;
}

/**
 * 댓글 작성 — 201 응답의 생성된 댓글을 그대로 돌려준다.
 * 호출부가 이 값을 목록 끝에 붙인다(전체 목록 재조회보다 이 응답을 우선한다).
 * content 는 호출부에서 trim·길이 검증을 끝낸 값을 넘긴다(서버도 strip + 1~1000자 검증).
 */
export function createComment(cardPublicId: string, content: string): Promise<CommentDto> {
  const body: CreateCommentRequest = { content };
  return apiPost<CommentDto>(commentsPath(cardPublicId), body);
}

/**
 * 댓글 삭제(soft delete) — 본인 댓글만 성공한다. 남의 댓글·부재·이미 삭제됨은 서버가 404.
 * 성공 응답에 data 가 없으므로 반환값을 쓰지 않는다.
 */
export async function deleteComment(cardPublicId: string, commentId: number): Promise<void> {
  await apiDelete<null>(`${commentsPath(cardPublicId)}/${commentId}`);
}
