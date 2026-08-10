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
          /*
            alertdialog — 단순 대화상자가 아니라 **되돌릴 수 없는 파괴적 작업의 확인**이다.
            스크린리더가 열리는 즉시 이름과 설명을 함께 읽어 사용자가 무엇을 지우는지 먼저 알게 한다.
          */
          role="alertdialog"
          aria-modal="true"
          aria-busy={pending}
          aria-labelledby="wiki-reset-title"
          /*
            설명은 두 조각을 함께 참조한다 — 삭제 대상(무엇을 지우는지)과 경고(복구 불가·영구 삭제).
            경고 문구가 빠지면 "되돌릴 수 없다"는 사실이 낭독되지 않아 alertdialog 를 쓰는 이유가 사라진다.
            경고는 문단 두 개라 개별 id 를 뿌리는 대신 감싸는 박스에 id 하나를 준다(DOM 구조 유지).
          */
          aria-describedby="wiki-reset-description wiki-reset-warning"
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

          <div
            id="wiki-reset-warning"
            className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3"
          >
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
            {/*
              확인 버튼만 **라이트 모드에서** solid destructive + 흰 글자로 덮어쓴다.
              공통 `destructive` variant 는 `bg-destructive/10 text-destructive`(연한 배경 + 빨간 글자)라
              되돌릴 수 없는 주 동작 치고 약하고, 옅은 배경 위 빨간 텍스트라 대비도 여유가 없다.
              **공통 variant 는 건드리지 않고** 이 모달에서만 className 으로 덮는다 —
              `cn()` 이 tailwind-merge 라 같은 유틸 그룹은 뒤(className)가 이긴다.

              다크 모드는 #65 의 기존 모습을 그대로 둔다: variant 의 `dark:bg-destructive/20`·
              `dark:hover:bg-destructive/30` 은 접두사가 달라 위 override 에 지워지지 않고 살아남는다.
              다만 `text-destructive` 는 접두사가 없어 `text-white` 에 밀리므로 `dark:text-destructive`
              로 되돌려 준다(다크에서 흰 글자가 되지 않게).

              포커스: solid 배경에서는 variant 의 `ring-destructive/20` 이 배경에 묻힌다.
              `ring-offset` 유틸은 이 레포에 사용례가 없어 의존하지 않고, 흰 테두리(border-background)로
              링과 버튼을 갈라 같은 효과를 낸다. 다크는 기존 링을 유지한다.
              disabled(pending)은 기존 `aria-disabled:opacity-50` 이 그대로 구분한다.
            */}
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!pending) onConfirm();
              }}
              aria-disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:border-background focus-visible:ring-destructive/50 dark:text-destructive dark:focus-visible:border-destructive/40 aria-disabled:pointer-events-none aria-disabled:opacity-50 sm:min-w-40"
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
