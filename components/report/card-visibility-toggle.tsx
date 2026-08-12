"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CopyToast } from "@/components/ui/copy-toast";
import { useCardVisibility } from "@/hooks/use-card-visibility";
import { isMorningBriefing } from "@/lib/report-type";
import type { CardVisibility } from "@/types/feed";

/**
 * 카드 상세 readbar 의 공개/비공개 전환 버튼 — **카드 소유자 전용**.
 *
 * 예전엔 `공유` 버튼이 모달(`card-share-modal.tsx`)을 열고 그 안에서 전환했다. 모달을 한 단계
 * 거치는 동안 "지금 이 글이 공개인지"가 화면에서 안 보였고, 전환 자체가 한 번 더 클릭해야
 * 닿는 곳에 있었다. 상태와 전환을 같은 버튼에 합쳐 readbar 에서 바로 보이고 바로 누르게 한다.
 *
 * ## 확인 단계는 공개 전환에만 둔다 (2026-08-12 우석 결정)
 *
 * - **비공개 → 공개**: 확인 다이얼로그를 거친다. 다른 사람 피드에 뜨고 좋아요·댓글이 열리는,
 *   되돌려도 이미 본 사람은 되돌릴 수 없는 방향이라 오조작 한 번이 그대로 노출이 된다.
 * - **공개 → 비공개**: 확인 없이 바로 바꾼다. 노출을 줄이는 방향이라 잘못 눌러도 손해가 없고,
 *   급히 내리고 싶을 때 단계를 끼우면 오히려 해가 된다.
 *
 * ## 아침 브리핑
 *
 * 아침 브리핑은 공개/비공개 개념 자체가 없다(항상 나만 보기). 그래서 **PRIVATE 아침 브리핑에는
 * 이 버튼을 렌더하지 않는다** — 호출부가 `morningBriefingPrivate` 로 거른다. 다만 서버 가드가
 * 없던 시절 공개된 PUBLIC 아침 브리핑은 여기로 와서 `비공개로 전환`만 할 수 있어야 한다.
 * 그래서 이 컴포넌트는 아침 브리핑이면 **공개 방향 CTA 를 스스로도 막는다**(훅의 `blocked` 와
 * 이중 방어 — 조건이 바뀌어도 공개 요청이 새 나가지 않게).
 *
 * 결과는 링크 복사와 같은 방식으로 알린다: 눈으로는 하단 토스트(`CopyToast`), 스크린리더로는
 * 상시 live region. 실패도 같은 자리에서 알린다 — 조용히 성공한 척하지 않는다.
 */
export function CardVisibilityToggle({
  publicId,
  reportType,
  visibility,
  onChanged,
}: {
  publicId: string;
  /** `CardResponse.reportType` 원본값. 판정은 `lib/report-type.ts` 가 한다(여기서 좁히지 않는다). */
  reportType?: unknown;
  visibility: CardVisibility;
  /** 서버가 확정한 값만 올라간다 — 상세가 카드에 이 한 필드만 병합한다. */
  onChanged: (next: CardVisibility) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { pending, failed, blocked, confirmed, change } = useCardVisibility({
    publicId,
    reportType,
    onChanged,
  });

  const isPublic = visibility === "PUBLIC";
  // 아침 브리핑은 공개 방향을 아예 제안하지 않는다(PUBLIC 구 데이터의 되돌리기만 남긴다).
  const canPublish = !isMorningBriefing(reportType);

  const handleClick = useCallback(() => {
    if (pending) return;
    if (isPublic) {
      change("PRIVATE"); // 노출을 줄이는 방향 — 확인 없이 바로
      return;
    }
    if (!canPublish) return; // 버튼 자체를 안 그리지만 이중 방어
    setConfirmOpen(true);
  }, [canPublish, change, isPublic, pending]);

  const confirmPublish = useCallback(() => {
    setConfirmOpen(false);
    change("PUBLIC");
  }, [change]);

  /*
    토스트 문구 — 진행 중에는 띄우지 않는다(버튼이 이미 "변경 중…"을 말한다).
    우선순위: 실패 → 차단 → 마지막 성공. `confirmed` 는 서버가 확정해 준 값이라
    낙관적 문구가 아니다.
  */
  const feedback = pending
    ? null
    : failed
      ? { tone: "error" as const, message: "공개 설정을 변경하지 못했어요. 잠시 후 다시 시도해 주세요." }
      : blocked
        ? { tone: "error" as const, message: "아침 브리핑은 공개로 전환할 수 없어요." }
        : confirmed === null
          ? null
          : {
              tone: "ok" as const,
              message: confirmed === "PUBLIC" ? "공개로 바꿨어요" : "비공개로 바꿨어요",
            };

  // 비공개 아침 브리핑은 호출부가 이미 걸렀지만, 공개 CTA 도 없고 되돌릴 것도 없으면 그릴 게 없다.
  if (!isPublic && !canPublish) return null;

  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        {feedback?.message ?? ""}
      </span>
      <CopyToast feedback={feedback} />
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        /*
          상태를 색으로만 구분하지 않는다 — 자물쇠/지구본 기호와 문구가 함께 말한다.
          공개 상태는 wash 배경으로 한 번 더 갈리되 새 색을 만들지 않는다(기존 토큰만).
        */
        className={`focus-ring inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-semibold whitespace-nowrap disabled:opacity-50 ${
          isPublic
            ? "border-signal-ink bg-wash text-signal-ink hover:brightness-[.97]"
            : "border-border bg-transparent text-ink-mid hover:bg-background"
        }`}
      >
        {pending ? "변경 중…" : isPublic ? "🌐 공개 중" : "🔒 비공개"}
      </button>

      {confirmOpen && (
        <PublishConfirmDialog
          onConfirm={confirmPublish}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

/**
 * 공개 전환 확인 다이얼로그 — 되돌려도 이미 본 사람은 되돌릴 수 없는 방향이라 한 번 묻는다.
 *
 * 모달 관례는 기존 `card-share-modal.tsx` 와 같다: portal · backdrop 클릭 닫기 · Esc 닫기 ·
 * `role="dialog"` + `aria-modal` + `aria-labelledby`. 열릴 때 주 CTA 에 포커스를 준다.
 * `confirmOpen` 은 클릭 콜백에서만 켜지므로 SSR·hydration 시점엔 항상 닫혀 있다.
 */
function PublishConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-[rgba(12,14,17,.45)]"
      onClick={onCancel}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-confirm-title"
          aria-describedby="publish-confirm-desc"
          className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 shadow-[0_16px_40px_rgba(10,12,15,.16)]"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="publish-confirm-title" className="text-[16px] font-bold text-foreground">
            이 보고서를 공개할까요?
          </h2>
          <p id="publish-confirm-desc" className="mt-2 text-[13.5px] leading-6 text-ink-mid">
            공개하면 다른 사람의 피드에 보이고 좋아요·댓글이 열립니다. 언제든 다시 비공개로
            바꿀 수 있지만, 이미 본 사람에게서는 되돌릴 수 없어요.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="focus-ring inline-flex h-9 items-center justify-center rounded-[10px] border border-border bg-card px-[15px] text-[13.5px] font-semibold whitespace-nowrap text-foreground hover:bg-background"
            >
              취소
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className="focus-ring inline-flex h-9 items-center justify-center rounded-[10px] border border-primary bg-primary px-[15px] text-[13.5px] font-semibold whitespace-nowrap text-primary-foreground hover:brightness-[.96]"
            >
              공개하기
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
