import { normalizeText } from "@/lib/normalize";
import { isUuid } from "@/lib/utils";
import type { CommentDto, CommentVM } from "@/types/comments";

/**
 * CommentDto(API) → CommentVM(화면 모델) 변환.
 * 백엔드 nullable 을 여기서 한 번 좁혀, 화면이 다시 판단하지 않게 한다.
 * 없는 값을 만들지 않는다(가짜 이름·가짜 이니셜·대체 날짜 금지).
 */

/** 댓글 시각 — 카드 createdAtLabel 과 같은 로케일 포맷(새 날짜 라이브러리 추가 없음). */
const COMMENT_AT_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** ISO → 표시 문자열. 문자열이 아니거나 파싱 실패면 빈 문자열(Invalid Date 노출 금지). */
function formatCommentAt(value: unknown): string {
  if (typeof value !== "string") return "";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "";
  return COMMENT_AT_FORMAT.format(new Date(ts));
}

/**
 * 댓글 1건 변환 — 렌더 불가한 항목은 **null** 을 돌려 호출부가 건너뛰게 한다.
 *
 * 건너뛰는 기준(대체할 수 없는 값):
 * - `id` 가 삭제 요청에 쓸 수 있는 정수가 아님 → 목록 key·삭제 대상 지정이 불가능하다.
 * - `content` 가 공백뿐 → 표시할 본문이 없다("(내용 없음)" 같은 문구를 만들지 않는다).
 *
 * 작성자·시각은 없으면 그 부분만 중립 처리하고 댓글 자체는 살린다.
 * 작성자 이름은 displayName → username 순의 실제 값이고, 둘 다 없으면 null 이다.
 * `authorPublicId` 는 UUID 로 검증된 값만 담아 프로필 링크가 죽지 않게 한다.
 */
export function toCommentVM(comment: CommentDto | null | undefined): CommentVM | null {
  if (comment === null || typeof comment !== "object") return null;
  if (typeof comment.id !== "number" || !Number.isInteger(comment.id)) return null;

  const content = normalizeText(comment.content);
  if (content === null) return null;

  const author = comment.author;
  const hasAuthorObject = author !== null && typeof author === "object";
  const authorName = hasAuthorObject
    ? (normalizeText(author.displayName) ?? normalizeText(author.username))
    : null;
  const rawAuthorId = hasAuthorObject ? normalizeText(author.publicId) : null;

  return {
    id: comment.id,
    content,
    authorName,
    authorInitial: authorName === null ? null : Array.from(authorName)[0],
    authorPublicId: rawAuthorId !== null && isUuid(rawAuthorId) ? rawAuthorId : null,
    createdAtLabel: formatCommentAt(comment.createdAt),
  };
}

/**
 * 댓글 배열 변환 — 렌더 불가 항목만 제외하고 **서버 순서(오래된 순)를 그대로 유지**한다.
 * 배열이 아니면 계약 위반이므로 throw 해 훅이 error 로 정규화한다(Empty 로 위장하지 않는다).
 */
export function toCommentVMs(
  comments: readonly (CommentDto | null | undefined)[] | null | undefined,
): CommentVM[] {
  if (!Array.isArray(comments)) {
    throw new TypeError("comments: expected an array");
  }
  const out: CommentVM[] = [];
  for (const comment of comments) {
    const vm = toCommentVM(comment);
    if (vm !== null) out.push(vm);
  }
  return out;
}
