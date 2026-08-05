"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useCardVisibility } from "@/hooks/use-card-visibility";
import { useCopyCardLink } from "@/hooks/use-copy-card-link";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { CardVisibility } from "@/types/feed";

/**
 * 카드 공유 모달 — **카드 소유자 전용**. 상세 readbar 의 `공유` 버튼이 연다.
 *
 * 현재 공개 상태를 설명하고 그 상태에서 할 수 있는 행동만 준다:
 * - PRIVATE: 공개하면 무엇이 달라지는지 알린 뒤 `공개하기`. 아직 남이 열 수 없는 링크라
 *   **`링크 복사` 를 두지 않는다**(열리지 않는 링크를 공유하도록 유도하지 않는다).
 * - PUBLIC: `링크 복사` 와 `비공개로 전환`.
 *
 * 공개 안내는 서버가 실제로 보장하는 범위까지만 말한다 — 다른 사용자 피드에 보이고(공개 피드
 * 쿼리가 `visibility = 'PUBLIC'`) 좋아요·댓글이 열린다(둘 다 PUBLIC 카드에서만 허용). 조회수·
 * 노출량·랭킹·추천 보장은 계약에 없으므로 쓰지 않는다.
 *
 * **열릴 때만 mount 된다**(호출부가 조건부 렌더) — pending·실패·확정값이 매번 초기화되므로
 * 이전에 닫으며 남긴 오류 문구가 다시 열 때 남지 않는다(effect 초기화도 필요 없다).
 *
 * 접근성은 기존 프로젝트 모달 패턴을 그대로 재사용한다(새 모달 라이브러리 없음):
 * createPortal(document.body) + useFocusTrap(배경 #app-shell inert · Tab 순환 · 트리거 포커스 복원)
 * + role="dialog" · aria-modal · aria-labelledby · aria-describedby + Escape·backdrop 닫기.
 * 최초 포커스는 영향이 큰 액션이 아니라 **안전한 닫기 버튼**에 둔다(`data-autofocus`).
 */
export function CardShareModal({
  onClose,
  publicId,
  title,
  visibility,
  onVisibilityChanged,
}: {
  onClose: () => void;
  publicId: string;
  title: string;
  /** 현재 확정 공개 범위 — 상세가 들고 있는 값이라 성공 후 이 모달의 내용도 함께 갱신된다. */
  visibility: CardVisibility;
  /** PATCH 성공 응답의 확정 visibility — 상세가 카드에 이 값만 병합한다. */
  onVisibilityChanged: (next: CardVisibility) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { pending, failed, confirmed, change } = useCardVisibility({
    publicId,
    onChanged: onVisibilityChanged,
  });
  const { copy, feedback } = useCopyCardLink(publicId);

  useFocusTrap(true, dialogRef);

  // Escape 로 닫기 — 요청 중에는 닫지 않는다(진행 중 상태를 화면에서 지우지 않기 위해서).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onClose]);

  /*
    변경 성공 시 포커스를 닫기 버튼으로 옮긴다. 성공하면 아래 액션 버튼이 새 상태에 맞는 것으로
    교체돼 방금 누른 버튼이 사라지고, 그대로 두면 포커스가 body 로 떨어져 트랩 밖으로 나간다.
    닫기 버튼은 두 상태에서 항상 같은 자리에 있고 파괴적이지 않다. setState 없이 포커스만 옮긴다.
  */
  useEffect(() => {
    if (confirmed === null) return;
    closeRef.current?.focus();
  }, [confirmed]);

  const isPublic = visibility === "PUBLIC";

  function close() {
    if (pending) return; // 요청 중 닫기 차단
    onClose();
  }

  const ghostBtn =
    "focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-[15px] text-[13.5px] font-semibold whitespace-nowrap text-foreground hover:bg-background disabled:opacity-50";
  const primaryBtn =
    "focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-primary bg-primary px-[15px] text-[13.5px] font-semibold whitespace-nowrap text-primary-foreground hover:brightness-[.96] disabled:opacity-50";

  /*
    진행·성공·실패·복사 결과를 한 live region 으로 합친다(같은 내용을 두 번 읽지 않도록).
    우선순위: 진행 중 → 실패 → 복사 결과(2.5초 후 사라짐) → 마지막 변경 성공.
    실패 문구는 코드 기준 공통 문구이며 서버 error.message 원문·내부 코드는 노출하지 않는다.
  */
  const isErrorLine = failed || feedback?.tone === "error";
  const statusLine = pending
    ? "변경 중…"
    : failed
      ? "공개 설정을 변경하지 못했어요. 잠시 후 다시 시도해 주세요."
      : (feedback?.message ??
        (confirmed === null
          ? ""
          : confirmed === "PUBLIC"
            ? "공개로 변경했어요"
            : "비공개로 변경했어요"));

  return createPortal(
    // 세로로 넘치면 backdrop 이 스크롤되어 320px·200% 확대에서도 하단 버튼까지 도달한다.
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-[rgba(12,14,17,.45)]"
      onClick={close}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          aria-describedby="share-modal-desc"
          onClick={(e) => e.stopPropagation()}
          className="w-[460px] max-w-full rounded-2xl border border-border bg-card px-6 py-[22px] shadow-[0_24px_60px_rgba(10,12,15,.28)]"
        >
          {/* .mhead */}
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="share-modal-title" className="text-[16.5px] font-bold text-foreground">
              {isPublic ? "공개 중인 보고서예요" : "보고서를 공개할까요?"}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              disabled={pending}
              aria-label="닫기"
              data-autofocus
              className="focus-ring shrink-0 rounded-[7px] px-[7px] py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* 어느 보고서인지 — 목록에서 여러 카드를 오갈 때 대상 확인용. */}
          <p className="mb-2.5 line-clamp-2 text-[13px] leading-[1.55] font-semibold text-ink-mid">
            {title}
          </p>

          {/* .ms — 현재 상태와 바뀔 결과 설명 */}
          <p id="share-modal-desc" className="text-[13px] leading-[1.7] text-ink-mid">
            {isPublic ? (
              <>
                다른 사용자에게 링크를 공유하거나 다시 비공개로 전환할 수 있어요.
                <br />
                공개 상태에서는 다른 사용자가 좋아요와 댓글을 남길 수 있어요.
              </>
            ) : (
              <>
                지금은 나만 볼 수 있어요.
                <br />
                공개하면 다른 사용자의 피드에서 볼 수 있고, 좋아요와 댓글을 받을 수 있어요.
              </>
            )}
          </p>

          <p
            role="status"
            aria-live="polite"
            className={`mt-3 min-h-[18px] text-[12px] leading-[1.5] ${
              isErrorLine ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {statusLine}
          </p>

          {/* .mfoot */}
          <div className="mt-2 flex flex-wrap justify-end gap-[9px]">
            {isPublic ? (
              <>
                <button type="button" onClick={copy} disabled={pending} className={ghostBtn}>
                  링크 복사
                </button>
                {/* 영향이 큰 변경이므로 목표 상태를 버튼 문구로 명확히 밝힌다. */}
                <button
                  type="button"
                  onClick={() => change("PRIVATE")}
                  disabled={pending}
                  className={ghostBtn}
                >
                  {pending ? "전환 중…" : "비공개로 전환"}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={close} disabled={pending} className={ghostBtn}>
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => change("PUBLIC")}
                  disabled={pending}
                  className={primaryBtn}
                >
                  {pending ? "공개 중…" : "공개하기"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
