"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

import { useRequireAuth } from "@/components/auth/use-require-auth";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { MOCK_MENU, MOCK_MENU_BOTTOM } from "@/lib/mock/feed";

/**
 * 모바일·태블릿 대체 내비 — 데스크톱 SideLeft 가 `max-[1100px]:hidden` 으로 사라지는 구간(≤1100px)에서
 * HomeNav 의 메뉴 버튼으로 여는 접근 가능한 drawer. 데스크톱(≥1101px)에서는 트리거가 숨겨져 열리지 않는다.
 *
 * - 메뉴 데이터는 SideLeft 와 동일한 MOCK_MENU / MOCK_MENU_BOTTOM 을 재사용한다(경로 하드코딩 금지).
 * - member: 홈·관심사·설정 모두 실제 이동. guest: 홈만 이동하고 나머지는 requireAuth 로 GuestGateModal 게이트
 *   (SideLeft guest 아이콘 내비와 동일 정책 — guest 정책 변경 없음).
 * - 현재 경로 항목은 aria-current="page" 로 표시하고 링크 대신 정적 표기한다.
 * - 접근성: role="dialog" · aria-modal · aria-label · 기존 useFocusTrap(트리거 저장·배경 inert·Tab 순환·포커스 복원)
 *   재사용 · Esc·backdrop 닫기. 새 모달 프레임워크를 만들지 않는다.
 */
export function MobileNavDrawer({
  open,
  onClose,
  guest,
}: {
  open: boolean;
  onClose: () => void;
  guest: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { requireAuth } = useRequireAuth();

  // 포커스 트랩 + 배경(#app-shell) inert + 트리거 복원. 초기 포커스는 닫기 버튼의 data-autofocus.
  useFocusTrap(open, panelRef);

  // Esc 로 닫기 (GuestGateModal 과 동일 패턴 — Esc·backdrop 는 각 오버레이가 처리)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    // backdrop — 클릭 시 닫기. createPortal 로 #app-shell 바깥(document.body)에 렌더.
    <div className="fixed inset-0 z-[125] bg-[rgba(12,14,17,.45)]" onClick={onClose}>
      {/* 좌측 패널 */}
      <div
        ref={panelRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 left-0 flex w-[280px] max-w-[80%] flex-col border-r border-border bg-card shadow-[0_16px_40px_rgba(10,12,15,.2)]"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[14px] font-bold text-foreground">메뉴</span>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="focus-ring rounded-[7px] px-[7px] py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* 메뉴 목록 — SideLeft 와 동일 데이터·순서 */}
        <nav aria-label="주요 메뉴" className="flex-1 overflow-y-auto p-2">
          {MOCK_MENU.map((item) => (
            <DrawerItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={!!item.href && pathname === item.href}
              guest={guest}
              onClose={onClose}
              onGate={() => requireAuth(() => {})}
            />
          ))}
          <div className="mx-1.5 my-[7px] h-px bg-border" />
          {MOCK_MENU_BOTTOM.map((item) => (
            <DrawerItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={!!item.href && pathname === item.href}
              guest={guest}
              onClose={onClose}
              onGate={() => requireAuth(() => {})}
            />
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}

/**
 * drawer 메뉴 항목 1개 — SideLeft MenuItem 시각 언어 재사용.
 * active → 정적 표기(aria-current). guest 의 홈 외 항목 → 게이트 버튼. 그 외 href → 이동 링크(클릭 시 drawer 닫기).
 */
function DrawerItem({
  icon,
  label,
  href,
  active,
  guest,
  onClose,
  onGate,
}: {
  icon: string;
  label: string;
  href?: string;
  active: boolean;
  guest: boolean;
  onClose: () => void;
  onGate: () => void;
}) {
  const base =
    "focus-ring mb-px flex w-full items-center gap-3 rounded-[10px] px-3 py-[11px] text-left text-[15px]";
  const iconCls = "inline-flex w-5 shrink-0 items-center justify-center text-[15px]";

  if (active) {
    return (
      <div aria-current="page" className={`${base} bg-background font-bold text-foreground`}>
        <span className={`${iconCls} text-primary`} aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
    );
  }

  // guest 는 홈만 이동, 나머지는 게이트(SideLeft guest 정책과 동일)
  if (guest && href && label !== "홈") {
    return (
      <button
        type="button"
        onClick={() => {
          onClose();
          onGate();
        }}
        title={`${label} — 로그인 후 이용할 수 있어요`}
        className={`${base} text-ink-mid hover:bg-background`}
      >
        <span className={`${iconCls} text-muted-foreground`} aria-hidden="true">
          {icon}
        </span>
        {label}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} onClick={onClose} className={`${base} text-ink-mid hover:bg-background`}>
        <span className={`${iconCls} text-muted-foreground`} aria-hidden="true">
          {icon}
        </span>
        {label}
      </Link>
    );
  }

  // href 없는 미구현 항목(현재 메뉴엔 없음) — 방어적 처리
  return (
    <span aria-disabled="true" className={`${base} text-muted-foreground`}>
      <span className={iconCls} aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
  );
}
