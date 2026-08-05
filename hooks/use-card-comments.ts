"use client";

import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useAsyncData } from "@/hooks/use-async-data";
import { toCommentVM, toCommentVMs } from "@/lib/adapters/comment";
import { createComment, deleteComment, fetchComments } from "@/lib/repositories/comments";
import { isUuid } from "@/lib/utils";
import { COMMENT_MAX_LENGTH, type CommentVM } from "@/types/comments";

/**
 * 카드 댓글 훅 — 목록 조회 + 작성 + 삭제. `enabled` 인 동안만 서버와 통신한다.
 *
 * 조회:
 * - `enabled`(= 인증 authenticated + PUBLIC 카드 + 카드 상세 ready)일 때만 요청한다.
 *   서버 계약상 목록도 인증 필수라 게스트로는 아예 부르지 않는다.
 * - 목록 상태는 공통 `useAsyncData` 로 정규화한다(AbortSignal 전달, cleanup 의미 그대로).
 *   StrictMode 를 끄지 않는다 — 개발 환경의 GET 중복 관측은 정상이다.
 * - 서버가 주는 **오래된 순**을 그대로 유지한다(프론트 재정렬 없음).
 *
 * 변형(작성·삭제):
 * - 서버 응답을 확정값으로 삼아 로컬 목록에 반영한다. 작성은 POST 응답 댓글을 목록 끝에 붙이고,
 *   전체 목록을 다시 받아오지 않는다. 삭제는 성공 확인 후 해당 항목만 제거한다.
 * - 실패하면 목록을 건드리지 않고 오류만 노출한다(mock 으로 보충하지 않는다).
 * - 삭제 pending 은 **댓글별로** 관리해 해당 버튼만 비활성화한다.
 *
 * 인증 만료(authenticated → guest)나 카드 변경 시 로컬 상태(추가분·pending·오류)를 초기화해
 * 이전 카드/세션의 댓글이 남지 않게 한다. 렌더 중 Math.random·시간 기반 key 를 쓰지 않는다.
 */
export type CardCommentsState =
  | { status: "loading" }
  | { status: "success"; comments: CommentVM[] }
  | { status: "empty" }
  | { status: "error" }
  /** enabled=false — 요청하지 않은 상태(게스트·PRIVATE 등). 화면이 별도 UI 를 그린다. */
  | { status: "disabled" };

export type CardCommentsApi = CardCommentsState & {
  refetch: () => void;
  /**
   * 삭제 버튼 노출 조건 — `comment.authorPublicId` 와 로그인 사용자 `publicId` 가 **둘 다 유효하고
   * 정확히 같을 때만** true. 하나라도 없거나 형식이 아니면 본인 댓글이라고 추측하지 않는다.
   * username·displayName·이메일·배열 위치로 소유권을 추정하지 않는다.
   */
  canDelete: (comment: CommentVM) => boolean;
  /** 작성 — 성공하면 true. content 는 훅이 trim·길이 검증한다. */
  submit: (content: string) => Promise<boolean>;
  submitting: boolean;
  /** 작성 실패 사유(화면 문구용 키). null 이면 오류 없음. */
  submitError: "validation" | "failed" | null;
  clearSubmitError: () => void;
  /** 삭제 — 성공하면 true. */
  remove: (commentId: number) => Promise<boolean>;
  /** 삭제 진행 중인 댓글 id 집합(버튼별 비활성화용). */
  deletingIds: ReadonlySet<number>;
  /** 삭제 실패 사유. null 이면 오류 없음. */
  deleteError: boolean;
  clearDeleteError: () => void;
};

/** 로컬 변형분 묶음 — `key`(카드+인증) 가 바뀌면 렌더 시 파생으로 버려진다. */
type LocalMutations = {
  key: string;
  appended: CommentVM[];
  removedIds: ReadonlySet<number>;
  submitting: boolean;
  submitError: "validation" | "failed" | null;
  deletingIds: ReadonlySet<number>;
  deleteError: boolean;
};

function emptyMutations(key: string): LocalMutations {
  return {
    key,
    appended: [],
    removedIds: new Set(),
    submitting: false,
    submitError: null,
    deletingIds: new Set(),
    deleteError: false,
  };
}

export function useCardComments({
  cardPublicId,
  enabled,
}: {
  cardPublicId: string;
  enabled: boolean;
}): CardCommentsApi {
  const { status, user } = useAuth();
  const isMember = status === "authenticated";
  const active = enabled && isMember;
  // 로그인 사용자의 publicId — 배포 전 응답에는 없을 수 있어 optional. UUID 형식일 때만 신뢰한다.
  const rawViewerId = user?.publicId;
  const viewerPublicId =
    typeof rawViewerId === "string" && isUuid(rawViewerId.trim()) ? rawViewerId.trim() : null;

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchComments(cardPublicId, signal).then(toCommentVMs),
    [cardPublicId],
  );
  const state = useAsyncData<CommentVM[]>(fetcher, active);

  /**
   * 서버 목록에 얹는 로컬 변형분(작성 append · 삭제 필터 · pending · 오류)을 **하나의 state** 로 묶고
   * `key` 를 함께 저장한다. 카드나 인증 상태가 바뀌면 key 가 달라지므로 effect 에서 초기화하지 않고
   * **렌더 시 파생**으로 빈 값을 쓴다 — useAsyncData 가 settled 태그를 비교하는 것과 같은 방식이고,
   * 이 저장소가 금지하는 set-state-in-effect 를 피한다.
   */
  const resetKey = `${cardPublicId}|${active ? "on" : "off"}`;
  const [stored, setStored] = useState<LocalMutations>(() => emptyMutations(resetKey));
  const local = stored.key === resetKey ? stored : emptyMutations(resetKey);
  /**
   * 제출 중복 방지 — state 반영을 기다리지 않고 즉시 막는다(연속 클릭 대응).
   * 락에 key 를 함께 담아 카드/세션이 바뀌면 남은 락을 무시한다. **쓰기는 이벤트 콜백 안에서만**
   * 한다(렌더 중 ref 갱신 금지 규칙 준수).
   */
  const submitLock = useRef<{ key: string; busy: boolean }>({ key: resetKey, busy: false });

  /** 항상 현재 key 로 기록한다 — 낡은 key 의 값은 다음 렌더에서 자동으로 버려진다. */
  const patch = useCallback(
    (update: (prev: LocalMutations) => Omit<LocalMutations, "key">) =>
      setStored((prev) => {
        const base = prev.key === resetKey ? prev : emptyMutations(resetKey);
        return { key: resetKey, ...update(base) };
      }),
    [resetKey],
  );

  const submit = useCallback(
    async (raw: string): Promise<boolean> => {
      if (!active) return false;
      // 다른 카드/세션의 락은 무시하고 현재 key 로 초기화한다.
      if (submitLock.current.key !== resetKey) submitLock.current = { key: resetKey, busy: false };
      if (submitLock.current.busy) return false;
      const content = raw.trim();
      if (content === "" || content.length > COMMENT_MAX_LENGTH) {
        patch((p) => ({ ...p, submitError: "validation" }));
        return false;
      }
      submitLock.current = { key: resetKey, busy: true };
      patch((p) => ({ ...p, submitting: true, submitError: null }));
      try {
        const created = toCommentVM(await createComment(cardPublicId, content));
        // 서버가 정상 댓글을 돌려주지 않았으면 목록을 흔들지 않고 오류로 알린다.
        if (created === null) {
          patch((p) => ({ ...p, submitting: false, submitError: "failed" }));
          return false;
        }
        patch((p) => ({
          ...p,
          appended: [...p.appended, created],
          submitting: false,
          submitError: null,
        }));
        return true;
      } catch {
        patch((p) => ({ ...p, submitting: false, submitError: "failed" }));
        return false;
      } finally {
        submitLock.current = { key: resetKey, busy: false };
      }
    },
    [active, cardPublicId, patch, resetKey],
  );

  const remove = useCallback(
    async (commentId: number): Promise<boolean> => {
      if (!active || local.deletingIds.has(commentId)) return false;
      patch((p) => ({
        ...p,
        deleteError: false,
        deletingIds: new Set(p.deletingIds).add(commentId),
      }));
      const clearPending = (p: LocalMutations) => {
        const next = new Set(p.deletingIds);
        next.delete(commentId);
        return next;
      };
      try {
        await deleteComment(cardPublicId, commentId);
        // 서버 성공 확인 후에만 목록에서 제거한다.
        patch((p) => ({
          ...p,
          removedIds: new Set(p.removedIds).add(commentId),
          appended: p.appended.filter((c) => c.id !== commentId),
          deletingIds: clearPending(p),
        }));
        return true;
      } catch {
        patch((p) => ({ ...p, deleteError: true, deletingIds: clearPending(p) }));
        return false;
      }
    },
    [active, cardPublicId, local.deletingIds, patch],
  );

  const clearSubmitError = useCallback(
    () => patch((p) => ({ ...p, submitError: null })),
    [patch],
  );
  const clearDeleteError = useCallback(() => patch((p) => ({ ...p, deleteError: false })), [patch]);

  const canDelete = useCallback(
    (comment: CommentVM) =>
      viewerPublicId !== null &&
      comment.authorPublicId !== null &&
      comment.authorPublicId === viewerPublicId,
    [viewerPublicId],
  );

  const common = {
    refetch: state.refetch,
    canDelete,
    submit,
    submitting: local.submitting,
    submitError: local.submitError,
    clearSubmitError,
    remove,
    deletingIds: local.deletingIds,
    deleteError: local.deleteError,
    clearDeleteError,
  };

  if (!active) return { status: "disabled", ...common };
  if (state.status === "error") return { status: "error", ...common };
  if (state.status !== "success") return { status: "loading", ...common };

  const comments = [...state.data, ...local.appended].filter((c) => !local.removedIds.has(c.id));
  return comments.length > 0
    ? { status: "success", comments, ...common }
    : { status: "empty", ...common };
}
