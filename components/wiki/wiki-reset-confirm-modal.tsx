"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/**
 * 개인 LLM Wiki 초기화 전 파괴 범위와 복구 불가 여부를 명시적으로 확인한다.
 * 안전한 선택인 취소에 초기 포커스를 두고, 요청 중에는 중복 실행과 모달 닫기를 막는다.
 */
export function WikiResetConfirmModal({
  open,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  function close() {
    if (!pending) onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[130] overflow-y-auto overscroll-contain bg-[rgba(12,14,17,.62)]"
      onClick={close}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-busy={pending}
          aria-labelledby="wiki-reset-title"
          aria-describedby="wiki-reset-description"
          onClick={(event) => event.stopPropagation()}
          className="w-[460px] max-w-full rounded-2xl border border-border bg-card px-6 py-[22px] shadow-[0_24px_60px_rgba(10,12,15,.28)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="wiki-reset-title" className="text-[17px] font-bold text-foreground">
                LLM Wiki를 초기화할까요?
              </h2>
              <p
                id="wiki-reset-description"
                className="mt-2 text-[13px] leading-[1.65] text-ink-mid"
              >
                이 계정에 저장된 원본 자료와 현재 Wiki 노드·관심사 연결을 모두 삭제합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={pending}
              aria-label="닫기"
              className="focus-ring shrink-0 rounded-[7px] px-[7px] py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3">
            <p className="text-[13px] font-semibold text-destructive">
              삭제한 데이터는 복구하거나 다시 사용할 수 없어요.
            </p>
            <p className="mt-1 text-[12px] leading-[1.6] text-muted-foreground">
              저장한 링크·메모를 포함한 클리핑 원본과 생성된 Wiki 데이터가 영구 삭제됩니다.
            </p>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              data-autofocus
              type="button"
              variant="outline"
              onClick={close}
              disabled={pending}
              className="sm:min-w-20"
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!pending) onConfirm();
              }}
              aria-disabled={pending}
              className="aria-disabled:pointer-events-none aria-disabled:opacity-50 sm:min-w-40"
            >
              {pending ? "초기화 중…" : "영구 삭제하고 초기화"}
            </Button>
          </div>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {pending ? "Wiki 초기화 요청을 처리하고 있어요. 완료될 때까지 기다려 주세요." : ""}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
