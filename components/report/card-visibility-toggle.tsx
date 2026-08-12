"use client";

import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import { CopyToast } from "@/components/ui/copy-toast";
import { useCardVisibility } from "@/hooks/use-card-visibility";
import type { CopyLinkFeedback } from "@/hooks/use-copy-card-link";
import { isMorningBriefing } from "@/lib/report-type";
import type { CardVisibility } from "@/types/feed";

/** 성공 토스트 노출 시간(ms) — 링크 복사 토스트(`useCopyLink`)와 같은 길이. */
const SUCCESS_TOAST_MS = 2500;

/** 드롭다운 항목 — 상태 이름과 "그러면 누가 볼 수 있나"만 말한다(장식 아이콘 없음). */
const OPTIONS: { value: CardVisibility; label: string; description: string }[] = [
  { value: "PUBLIC", label: "공개", description: "누구나 링크로 보고서를 볼 수 있어요" },
  { value: "PRIVATE", label: "비공개", description: "나만 보고서를 볼 수 있어요" },
];

/**
 * 카드 상세 readbar 의 공개 범위 컨트롤 — **카드 소유자 전용**.
 *
 * ## 배지처럼 생긴 버튼이 눌리자마자 상태를 바꾸던 문제 (2026-08-13 UI 검수)
 *
 * 예전에는 `🌐 공개 중` / `🔒 비공개` 한 버튼이 **현재 상태 표시와 전환을 겸했다**. 생김새는
 * 상태 배지인데 클릭 한 번이 곧 반대 상태로의 변경이라, "지금 공개인가?"를 확인하려고 누른
 * 사람이 의도 없이 공개 범위를 바꾸게 됐다. 이제 버튼은 **현재 상태만** 말하고(`공개`/`비공개`),
 * 클릭은 드롭다운을 열 뿐이다. 값은 목록에서 **명시적으로 고를 때만** 바뀐다.
 *
 * - 같은 항목을 다시 고르면 요청을 보내지 않고 메뉴만 닫는다(바뀐 게 없으므로).
 * - 변경 중(`pending`)에는 트리거를 비활성화한다 — 훅의 ref 락과 이중으로 중복 요청을 막는다.
 * - 낙관 표시는 하지 않는다. **서버가 확정한 값**이 온 뒤에 상태와 성공 토스트가 바뀐다.
 * - 실패하면 이전 상태 그대로 두고 같은 자리에서 오류만 알린다(조용히 성공한 척하지 않는다).
 *
 * 지구본·자물쇠 이모지는 뺐다. 상태는 문구가 말하고, 공개일 때 `wash` 배경 + `signal-ink`
 * 테두리로 한 번 더 갈린다(새 색 없음) — 색을 못 봐도 문구만으로 판별된다.
 *
 * **확인 다이얼로그는 없앴다.** 예전 `비공개 → 공개` 확인 모달은 "한 번 클릭 = 즉시 공개"를
 * 막으려고 있었는데, 이제 메뉴를 열고 `공개` 를 고르는 두 단계 자체가 그 명시적 의사표시다.
 * 여기에 모달까지 겹치면 3단계가 된다. 대신 성공 토스트에 `되돌리기` 를 달아 오조작을 즉시
 * 되돌릴 수 있게 했다. **공개 차단 정책(아침 브리핑)은 그대로다** — 훅과 서버가 계속 막는다.
 *
 * ## 아침 브리핑
 *
 * 아침 브리핑은 공개/비공개 개념이 없다(항상 나만 보기). PRIVATE 아침 브리핑에는 이 컨트롤을
 * 아예 렌더하지 않는다 — 호출부가 `morningBriefingPrivate` 로 거른다. 서버 가드가 없던 시절
 * 공개된 PUBLIC 아침 브리핑만 여기로 와서 `비공개로 전환`을 할 수 있어야 하므로, 그때는 메뉴에
 * **`비공개` 항목만** 둔다(비활성이 아니라 미노출 — 기존 공유 모달과 같은 규칙). 되돌리기도
 * 같은 이유로 공개 방향으로는 제안하지 않는다.
 *
 * 접근성: 트리거는 `aria-haspopup="menu"` + `aria-expanded`, 목록은 `role="menu"` +
 * `role="menuitemradio"` + `aria-checked`(현재 값이 무엇인지 체크 아이콘 없이도 전달된다).
 * ↑↓·Home·End 이동, Escape·바깥 클릭으로 닫고 **트리거로 포커스를 되돌린다**
 * (관례는 피드 카드 `⋯` 메뉴 — `components/home/post-more-menu.tsx` 와 같다).
 * 결과 낭독은 상시 live region 이 맡는다(토스트 문구는 aria-hidden — `CopyToast` 주석 참조).
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
  const [open, setOpen] = useState(false);
  /** 지금 떠 있는 토스트. `undoTo` 가 있으면 그 값으로 되돌리는 액션을 함께 그린다. */
  const [toast, setToast] = useState<
    { feedback: CopyLinkFeedback; undoTo: CardVisibility | null } | null
  >(null);
  const { pending, change } = useCardVisibility({ publicId, reportType, onChanged });

  const timer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isPublic = visibility === "PUBLIC";
  // 아침 브리핑은 공개 방향을 아예 제안하지 않는다(PUBLIC 구 데이터의 되돌리기만 남긴다).
  const canPublish = !isMorningBriefing(reportType);
  const options = canPublish ? OPTIONS : OPTIONS.filter((o) => o.value === "PRIVATE");

  // 언마운트(상세 이탈) 시 남은 타이머만 정리한다 — effect 에서 setState 하지 않는다.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  // 바깥 클릭·Escape 로 닫는다. 열려 있을 때만 document 리스너를 건다.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 열리면 현재 값 항목으로 포커스를 옮긴다(포커스 이동일 뿐 상태 변경이 아니다).
  useEffect(() => {
    if (!open) return;
    const root = wrapRef.current;
    const items = root?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    const checked = root?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
    (checked ?? items?.[0])?.focus();
  }, [open]);

  const dismiss = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  /**
   * 결과 토스트. **성공만 자동으로 닫는다**(2.5초) — 오류는 다음 시도로 교체될 때까지 남긴다.
   * 사라지는 오류 안내는 놓치면 무슨 일이 있었는지 알 길이 없다(기존 동작 유지).
   */
  const showToast = useCallback(
    (feedback: CopyLinkFeedback, undoTo: CardVisibility | null) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      setToast({ feedback, undoTo });
      timer.current =
        feedback.tone === "ok" ? window.setTimeout(() => setToast(null), SUCCESS_TOAST_MS) : null;
    },
    [],
  );

  /**
   * 실제 변경 1회. `undoTo` 는 성공 토스트에 달 되돌리기 대상이고, null 이면 액션 없이 알리기만 한다.
   * 결과는 훅이 돌려주는 값 하나로 갈린다 — 진행 중 상태(`pending`)와 섞지 않는다.
   */
  const run = useCallback(
    (next: CardVisibility, undoTo: CardVisibility | null) => {
      void change(next).then((result) => {
        if (result.ok) {
          showToast(
            {
              tone: "ok",
              message:
                result.visibility === "PUBLIC" ? "공개로 변경했습니다." : "비공개로 변경했습니다.",
            },
            // 서버가 확정한 값이 되돌릴 값과 같으면(요청과 다른 응답) 되돌릴 게 없다.
            undoTo === result.visibility ? null : undoTo,
          );
          return;
        }
        // 락에 막힌 중복 클릭은 실패가 아니다 — 진행 중인 요청의 결과가 곧 뜬다.
        if (result.reason === "busy") return;
        showToast(
          {
            tone: "error",
            message:
              result.reason === "blocked"
                ? "아침 브리핑은 공개로 전환할 수 없어요."
                : "공개 설정을 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
          },
          null,
        );
      });
    },
    [change, showToast],
  );

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  /** 메뉴 선택. 현재 값을 다시 고르면 **요청 없이** 닫기만 한다. */
  function onSelect(next: CardVisibility) {
    close();
    if (next === visibility) return;
    // 되돌리기 대상은 지금 값이다. 단 공개 방향이 막힌 카드면 제안하지 않는다(눌러도 실패한다).
    run(next, visibility === "PUBLIC" && !canPublish ? null : visibility);
  }

  /**
   * 되돌리기 — 직전 상태로 다시 변경한다. 실패하면 오류 토스트가 뜨고 상태는 그대로다
   * (임의로 성공 처리하지 않는다). 되돌린 결과에는 되돌리기를 다시 달지 않는다 — 두 상태를
   * 무한히 오가는 고리가 되고, 원래 상태로 돌아왔으니 더 되돌릴 것도 없다.
   */
  function onUndo(to: CardVisibility) {
    dismiss();
    run(to, null);
  }

  function onItemKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const root = wrapRef.current;
    const els = root
      ? Array.from(root.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'))
      : [];
    const index = els.indexOf(e.currentTarget);
    if (index === -1) return;
    let next = index;
    switch (e.key) {
      case "ArrowDown":
        next = (index + 1) % els.length;
        break;
      case "ArrowUp":
        next = (index - 1 + els.length) % els.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = els.length - 1;
        break;
      case "Tab":
        // 메뉴 밖으로 나가면 닫는다(포커스는 브라우저가 옮긴다 — 여기서 되돌리지 않는다).
        setOpen(false);
        return;
      default:
        return;
    }
    e.preventDefault();
    els[next]?.focus();
  }

  // 비공개 아침 브리핑은 호출부가 이미 걸렀지만, 공개 CTA 도 없고 되돌릴 것도 없으면 그릴 게 없다.
  if (!isPublic && !canPublish) return null;

  /** 지금 토스트가 되돌릴 수 있는 상태(없으면 null) — 액션 유무와 낭독 문구가 같은 값을 본다. */
  const undoTo = toast?.undoTo ?? null;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      {/*
        낭독은 이 상시 live region 이 맡는다. 되돌리기 버튼은 토스트가 뜬 뒤 초점을 줘야 닿는
        자리라, 그런 게 있다는 사실을 문구에 함께 실어 준다(시각 사용자는 버튼이 보인다).
      */}
      <span role="status" aria-live="polite" className="sr-only">
        {toast === null
          ? ""
          : undoTo !== null
            ? `${toast.feedback.message} 되돌리려면 되돌리기 버튼을 누르세요.`
            : toast.feedback.message}
      </span>
      <CopyToast
        feedback={toast?.feedback ?? null}
        action={undoTo === null ? null : { label: "되돌리기", onAction: () => onUndo(undoTo) }}
      />

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        /*
          상태를 색으로만 구분하지 않는다 — 문구(`공개`/`비공개`)가 먼저 말한다.
          공개 상태는 wash 배경으로 한 번 더 갈리되 새 색을 만들지 않는다(기존 토큰만).
        */
        className={`focus-ring inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-semibold whitespace-nowrap disabled:opacity-50 ${
          isPublic
            ? "border-signal-ink bg-wash text-signal-ink hover:brightness-[.97]"
            : "border-border bg-transparent text-ink-mid hover:bg-background"
        }`}
      >
        {pending ? "변경 중…" : isPublic ? "공개" : "비공개"}
        <IconChevron />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="공개 범위"
          className="absolute top-9 right-0 z-40 w-[272px] rounded-[11px] border border-border bg-card p-[5px] shadow-[0_10px_30px_rgba(10,12,15,.14)]"
        >
          {options.map((option) => {
            const selected = option.value === visibility;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => onSelect(option.value)}
                onKeyDown={onItemKeyDown}
                className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-[9px] text-left hover:bg-background"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-4 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                {/* 선택 표시는 작은 체크 하나뿐 — 의미는 aria-checked 가 따로 전달한다. */}
                {selected && <IconCheck />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 드롭다운임을 알리는 작은 chevron — 문구 오른쪽 장식이라 aria-hidden. */
function IconChevron() {
  return (
    <svg
      width={9}
      height={9}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 opacity-70"
    >
      <path d="M2.4 3.9 5 6.5 7.6 3.9" />
    </svg>
  );
}

/** 현재 선택된 항목 표시. 뜻은 `aria-checked` 가 말하므로 여기서는 그리기만 한다. */
function IconCheck() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-signal-ink"
    >
      <path d="M2.8 7.4 5.6 10.2 11.2 4.2" />
    </svg>
  );
}
