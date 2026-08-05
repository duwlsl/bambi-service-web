"use client";

import { type FormEvent, useId, useState } from "react";
import Link from "next/link";

import { useRequireAuth } from "@/components/auth/use-require-auth";
import { useCardComments } from "@/hooks/use-card-comments";
import { COMMENT_MAX_LENGTH, type CommentVM } from "@/types/comments";

/**
 * 실 카드 상세의 댓글 섹션 — PUBLIC 카드에서만 렌더된다(호출부가 판정).
 *
 * 데이터·변형 상태는 전부 useCardComments 가 소유하고, 이 컴포넌트는 렌더만 한다.
 * 게스트는 서버 계약상 목록도 인증이 필요해 API 를 호출하지 않고, 기존 인증 유도(useRequireAuth
 * → GuestGateModal)를 재사용한다 — 새 로그인 모달을 만들지 않는다.
 *
 * 마크업 관례는 mock 상세(report-screen.tsx)의 「댓글 · 메모」 블록과 맞춘다(.block 카드 ·
 * 30px 아바타 · 12.5px 이름 · 13px 본문 · border-b 구분). 다만 그쪽은 mock 이라 그대로 두고
 * 여기서는 실 데이터만 렌더한다(가짜 댓글 수·가짜 아바타 이미지 없음).
 */
export function CardComments({
  cardPublicId,
  guest,
}: {
  cardPublicId: string;
  guest: boolean;
}) {
  const comments = useCardComments({ cardPublicId, enabled: !guest });

  return (
    <section
      aria-labelledby="card-comments-heading"
      className="mb-4 rounded-2xl border border-border bg-card px-6 py-5"
    >
      <h2
        id="card-comments-heading"
        className="mb-3.5 flex items-center gap-[9px] text-[15px] font-bold text-foreground"
      >
        댓글
        {comments.status === "success" && (
          // 건수는 **실제 배열 길이**다 — 별도 count API 를 추측하지 않는다.
          <span className="text-xs font-medium text-muted-foreground">
            {comments.comments.length}건
          </span>
        )}
      </h2>

      {comments.status === "disabled" ? (
        <GuestPrompt />
      ) : comments.status === "loading" ? (
        <CommentsLoading />
      ) : comments.status === "error" ? (
        <CommentsError onRetry={comments.refetch} />
      ) : (
        <>
          {comments.status === "empty" ? (
            <CommentsEmpty />
          ) : (
            <ul className="mb-3.5">
              {comments.comments.map((comment) => (
                <li key={comment.id} className="border-b border-border py-3 last:border-b-0">
                  <CommentRow
                    comment={comment}
                    deletable={comments.canDelete(comment)}
                    deleting={comments.deletingIds.has(comment.id)}
                    onDelete={() => void comments.remove(comment.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          {comments.deleteError && (
            <p role="alert" className="mb-2.5 text-[12.5px] leading-[1.6] text-destructive">
              댓글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.
            </p>
          )}

          <CommentForm
            submitting={comments.submitting}
            submitError={comments.submitError}
            onClearError={comments.clearSubmitError}
            onSubmit={comments.submit}
          />
        </>
      )}
    </section>
  );
}

/** 게스트 — API 를 부르지 않고 기존 인증 유도 플로우로 보낸다. */
function GuestPrompt() {
  const { requireAuth } = useRequireAuth();
  return (
    <div className="py-1.5">
      <p className="text-[13px] leading-[1.7] text-ink-mid">
        로그인하면 댓글을 확인하고 작성할 수 있어요.
      </p>
      <button
        type="button"
        // requireAuth 는 비로그인에서 기존 GuestGateModal 을 띄운다(여기서 새 모달을 만들지 않는다).
        onClick={() => requireAuth(() => {})}
        className="focus-ring mt-3 inline-flex h-[38px] items-center justify-center rounded-[10px] border border-primary bg-primary px-4 text-[13.5px] font-semibold whitespace-nowrap text-primary-foreground hover:brightness-[.96]"
      >
        로그인하고 댓글 보기
      </button>
    </div>
  );
}

/** 로딩 — 댓글 영역만 차지하는 중립 스켈레톤. 카드 본문·출처는 그대로 보인다. */
function CommentsLoading() {
  const bar = "rounded-md bg-[var(--skel1)]";
  return (
    <div className="py-1.5">
      <div aria-hidden="true" className="animate-pulse">
        {[0, 1].map((i) => (
          <div key={i} className="mb-3 flex items-start gap-2.5 last:mb-0">
            <div className={`h-[30px] w-[30px] shrink-0 rounded-full ${bar}`} />
            <div className="min-w-0 flex-1">
              <div className={`mb-1.5 h-3 w-28 ${bar}`} />
              <div className={`h-3.5 w-[80%] ${bar}`} />
            </div>
          </div>
        ))}
      </div>
      <span role="status" className="sr-only">
        댓글을 불러오는 중…
      </span>
    </div>
  );
}

/** 빈 상태 — 오류처럼 보이지 않게 두고, 아래 작성 폼은 그대로 쓸 수 있다. */
function CommentsEmpty() {
  return (
    <div className="mb-3.5 py-1.5">
      <p className="text-[13px] leading-[1.7] font-semibold text-ink-mid">아직 댓글이 없어요</p>
      <p className="mt-0.5 text-[12.5px] leading-[1.6] text-muted-foreground">
        첫 댓글을 남겨보세요.
      </p>
    </div>
  );
}

/** 목록 조회 실패 — 댓글 영역 안에서만 알리고 재시도를 준다(카드 전체를 바꾸지 않는다). */
function CommentsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="py-1.5">
      <p className="text-[13px] leading-[1.7] text-ink-mid">
        댓글을 불러오지 못했어요. 일시적인 문제일 수 있어요.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-2.5 inline-flex items-center justify-center rounded-lg border border-border bg-transparent px-3 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-ink-mid hover:bg-background"
      >
        다시 시도
      </button>
    </div>
  );
}

/** 댓글 한 줄 — 아바타(이니셜) + 이름/시각 + 본문 + (본인일 때) 삭제. */
function CommentRow({
  comment,
  deletable,
  deleting,
  onDelete,
}: {
  comment: CommentVM;
  deletable: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const name = comment.authorName ?? "알 수 없는 사용자";
  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-input bg-background text-[9.5px] font-bold text-muted-foreground"
      >
        {/* 이미지 URL 계약이 없어 이니셜만 쓴다. 이름이 없으면 중립 기호. */}
        {comment.authorInitial ?? "◍"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          {comment.authorPublicId !== null ? (
            <Link
              href={`/users/${comment.authorPublicId}`}
              className="focus-ring rounded-[3px] text-[12.5px] font-bold text-foreground hover:text-signal-ink"
            >
              {name}
            </Link>
          ) : (
            <span
              className={`text-[12.5px] font-bold ${comment.authorName === null ? "text-muted-foreground" : "text-foreground"}`}
            >
              {name}
            </span>
          )}
          {comment.createdAtLabel && (
            <span className="text-[11.5px] font-normal text-muted-foreground">
              {comment.createdAtLabel}
            </span>
          )}
        </div>
        {/* 일반 텍스트로만 렌더(HTML 삽입 없음) + 줄바꿈 보존 + 긴 문자열 줄바꿈. */}
        <p className="mt-[3px] text-[13px] leading-[1.6] whitespace-pre-wrap break-words text-ink-mid">
          {comment.content}
        </p>
      </div>
      {deletable && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`내 댓글 삭제${comment.createdAtLabel ? ` (${comment.createdAtLabel})` : ""}`}
          className="focus-ring shrink-0 rounded-lg px-2 py-1 text-[11.5px] font-semibold whitespace-nowrap text-muted-foreground hover:bg-background hover:text-ink-mid disabled:opacity-50"
        >
          {deleting ? "삭제 중…" : "삭제"}
        </button>
      )}
    </div>
  );
}

/** 작성 폼 — 실제 form + textarea. 글자 수는 입력 요소와 aria-describedby 로 연결한다. */
function CommentForm({
  submitting,
  submitError,
  onClearError,
  onSubmit,
}: {
  submitting: boolean;
  submitError: "validation" | "failed" | null;
  onClearError: () => void;
  onSubmit: (content: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const uid = useId();
  const fieldId = `${uid}-comment`;
  const countId = `${uid}-count`;
  const errorId = `${uid}-error`;

  const trimmed = value.trim();
  const tooLong = trimmed.length > COMMENT_MAX_LENGTH;
  const canSubmit = trimmed !== "" && !tooLong && !submitting;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return; // 공백뿐·초과·중복 제출은 요청하지 않는다
    if (await onSubmit(value)) setValue("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor={fieldId} className="sr-only">
        댓글 입력
      </label>
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (submitError !== null) onClearError();
        }}
        disabled={submitting}
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        placeholder="댓글을 입력하세요"
        aria-describedby={submitError !== null ? `${countId} ${errorId}` : countId}
        aria-invalid={submitError === "validation" || tooLong || undefined}
        className="focus-ring w-full resize-y rounded-[10px] border border-border bg-background px-3.5 py-2.5 text-[13px] leading-[1.6] text-foreground placeholder:text-low disabled:opacity-60"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span
          id={countId}
          aria-live="polite"
          className={`text-[11.5px] ${tooLong ? "font-semibold text-destructive" : "text-muted-foreground"}`}
        >
          {trimmed.length} / {COMMENT_MAX_LENGTH}자
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="focus-ring inline-flex h-[36px] items-center justify-center rounded-[10px] border border-primary bg-primary px-4 text-[13px] font-semibold whitespace-nowrap text-primary-foreground hover:brightness-[.96] disabled:border-border disabled:bg-secondary disabled:text-muted-foreground"
        >
          {submitting ? "등록 중…" : "댓글 등록"}
        </button>
      </div>
      {submitError !== null && (
        <p id={errorId} role="alert" className="mt-2 text-[12.5px] leading-[1.6] text-destructive">
          {submitError === "validation"
            ? `댓글은 1자 이상 ${COMMENT_MAX_LENGTH}자 이하로 입력해 주세요.`
            : "댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요."}
        </p>
      )}
    </form>
  );
}
