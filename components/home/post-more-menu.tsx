"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { CopyToast } from "@/components/ui/copy-toast";
import { useCopyCardLink } from "@/hooks/use-copy-card-link";

/** 메뉴 항목 식별자 — 동작 분기 기준(문구·아이콘만 배열에 담고 핸들러는 담지 않는다). */
type MenuItemKey = "copy" | "share";

/**
 * 피드 카드 우상단 `⋯` 메뉴 — 목업 `.pmore`(트리거) + `.svpop`(팝오버) 자리다.
 *
 * 목업에는 `⋯` 만 있고 내용이 없어 이전에는 만들지 않았는데(가짜 UI 금지), **실제로 동작하는
 * 항목이 둘 생겨서** 열었다(2026-08-07):
 * - `링크 복사` — 기존 공용 훅(useCopyCardLink). `{origin}/report/{publicId}` 문자열 복사.
 * - `다른 앱으로 공유` — Web Share API(`navigator.share`). OS 공유 시트를 띄운다.
 *
 * **둘 다 서버 요청이 없다.** 새 엔드포인트도, 카드 상태 변경도 없다 — 재게시(리포스트)는 대응
 * API 가 없어 넣지 않는다(넣을 예정도 없음, 2026-08-07 확정).
 *
 * `navigator.share` 는 보안 컨텍스트(https·localhost)와 지원 브라우저에서만 존재한다. **없으면
 * 항목 자체를 렌더하지 않는다** — 눌러도 아무 일 없는 메뉴를 남기지 않는다. 판별은 메뉴를 여는
 * 클릭 시점에 하므로 SSR·hydration 과 무관하다(서버에서는 팝오버가 렌더되지 않는다).
 *
 * 목업 토큰: `.pmore`(18px, ink-dim, padding 0 4px) · `.svpop`(right 0 / top 24, bg, border,
 * radius 11, shadow `0 10px 30px rgba(10,12,15,.14)`, padding 5, width 168) ·
 * `.pi`(12.5px/600 ink-mid, gap 8, padding 9/12, radius 8, hover bg-soft + ink).
 *
 * 접근성: `aria-haspopup="menu"` + `aria-expanded` 트리거, `role="menu"`/`role="menuitem"`,
 * 열면 첫 항목으로 포커스 이동, ↑↓·Home·End 이동, Escape·바깥 클릭으로 닫고 **트리거로 포커스
 * 복원**. 피드에는 카드가 여러 장이라 트리거 이름에 제목을 붙여 어느 카드인지 구분한다.
 */
export function PostMoreMenu({ publicId, title }: { publicId: string; title: string }) {
  const [open, setOpen] = useState(false);
  /** 메뉴를 여는 시점에 판별한 Web Share 지원 여부(렌더 중 navigator 접근을 피한다). */
  const [canWebShare, setCanWebShare] = useState(false);
  const { copy, feedback } = useCopyCardLink(publicId);

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /**
   * 메뉴 항목 DOM — 항목마다 ref 를 배열로 모으는 대신 열려 있는 팝오버에서 직접 찾는다.
   * 렌더 중 ref 값을 건드리지 않으므로(react-hooks/refs) 이 함수는 effect·이벤트 핸들러에서만 부른다.
   */
  function menuItems(): HTMLButtonElement[] {
    const root = wrapRef.current;
    return root ? Array.from(root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')) : [];
  }

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

  // 열리면 첫 항목으로 포커스를 옮긴다(포커스 이동일 뿐 상태 변경이 아니다).
  useEffect(() => {
    if (!open) return;
    const root = wrapRef.current;
    root?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open]);

  function toggle() {
    if (!open) {
      setCanWebShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }
    setOpen((v) => !v);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  /**
   * 항목 선택. **핸들러를 `items` 배열에 담지 않는다** — 배열이 ref 를 읽는 함수를 품으면 그 배열을
   * 렌더에서 쓰는 것 자체가 "렌더 중 ref 접근"으로 잡힌다(react-hooks/refs). 데이터만 배열에 두고
   * 동작은 key 로 가른다.
   *
   * `다른 앱으로 공유` 는 OS 공유 시트를 띄운다. 사용자가 시트를 닫으면 `AbortError` 가 나는데
   * **실패가 아니므로 아무것도 알리지 않는다.** 시트를 아예 열지 못한 경우에만 링크 복사로
   * 물러난다 — 조용히 아무 일도 일어나지 않는 것보다 낫고, 그때 뜨는 문구("링크를 복사했어요")는
   * 실제로 일어난 일과 일치한다.
   */
  function onSelect(key: MenuItemKey) {
    close();
    if (key === "copy") {
      copy();
      return;
    }
    const url = `${window.location.origin}/report/${encodeURIComponent(publicId)}`;
    void navigator.share({ title, url }).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") return;
      copy();
    });
  }

  const items: { key: MenuItemKey; label: string; icon: React.ReactNode }[] = [
    { key: "copy", label: "링크 복사", icon: <IconLink /> },
    ...(canWebShare
      ? [{ key: "share" as const, label: "다른 앱으로 공유", icon: <IconShare /> }]
      : []),
  ];

  function onItemKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const els = menuItems();
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

  return (
    <div ref={wrapRef} className="relative shrink-0">
      {/* .pmore */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-[18px] leading-none hover:bg-background hover:text-ink-mid ${
          open ? "bg-background text-ink-mid" : "text-muted-foreground"
        }`}
      >
        <span aria-hidden="true">⋯</span>
        <span className="sr-only">공유 메뉴 — {title}</span>
      </button>

      {/* .svpop */}
      {open && (
        <div
          role="menu"
          aria-label={`${title} 공유 메뉴`}
          className="absolute top-9 right-0 z-40 w-[168px] rounded-[11px] border border-border bg-card p-[5px] shadow-[0_10px_30px_rgba(10,12,15,.14)]"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => onSelect(item.key)}
              onKeyDown={onItemKeyDown}
              className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-[9px] text-left text-[12.5px] font-semibold whitespace-nowrap text-ink-mid hover:bg-background hover:text-foreground"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      <span role="status" aria-live="polite" className="sr-only">
        {feedback?.message ?? ""}
      </span>
      <CopyToast feedback={feedback} />
    </div>
  );
}

/** 링크(사슬) — 목업 `.pi svg` 자리. 13px stroke 아이콘(화면의 다른 아이콘과 같은 규격). */
function IconLink() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M5.8 8.2a2.4 2.4 0 0 0 3.4 0l2-2a2.4 2.4 0 0 0-3.4-3.4l-.8.8" />
      <path d="M8.2 5.8a2.4 2.4 0 0 0-3.4 0l-2 2a2.4 2.4 0 0 0 3.4 3.4l.8-.8" />
    </svg>
  );
}

/** 내보내기(위로 향한 화살표) — OS 공유 시트를 뜻한다. */
function IconShare() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M7 9.2V1.8" />
      <path d="M4.4 4.4 7 1.8l2.6 2.6" />
      <path d="M2.6 8.4v2.8a1 1 0 0 0 1 1h6.8a1 1 0 0 0 1-1V8.4" />
    </svg>
  );
}
