import Link from "next/link";

import { MOCK_MENU, MOCK_MENU_BOTTOM } from "@/lib/mock/feed";

/**
 * 좌측 메뉴 — 목업 .side-l 1:1. 홈·카드 상세가 공유한다.
 * 홈 외 항목(보관함·지식창고·위키·프로필·설정)은 P1 화면 → 시각 전용(aria-disabled).
 * "홈"은 현재 화면이 아니면 실제 링크(/)로 동작한다(목업 data-screen="home"과 동일).
 */
export function SideLeft({
  current,
  footLines,
}: {
  /** 현재 화면의 메뉴 라벨 (예: "홈"). 해당 항목이 .on 처리된다. */
  current?: string;
  /** .side-foot 줄 목록 */
  footLines: string[];
}) {
  return (
    <aside className="sticky top-4 w-[300px] shrink-0 max-[1100px]:hidden">
      {/* .menu */}
      <div className="rounded-[14px] border border-border bg-card p-2">
        {MOCK_MENU.map((item) => (
          <MenuItem key={item.label} {...item} active={item.label === current} />
        ))}
        {/* .divider */}
        <div className="mx-1.5 my-[7px] h-px bg-border" />
        {MOCK_MENU_BOTTOM.map((item) => (
          <MenuItem key={item.label} {...item} active={item.label === current} />
        ))}
      </div>
      {/* .side-foot */}
      <div className="mt-3 px-1.5 text-[11.5px] leading-[1.6] text-muted-foreground">
        {footLines.map((line, i) => (
          <span key={line}>
            {line}
            {i < footLines.length - 1 && <br />}
          </span>
        ))}
      </div>
    </aside>
  );
}

function MenuItem({
  icon,
  label,
  count,
  active,
}: {
  icon: string;
  label: string;
  count?: string;
  active: boolean;
}) {
  const base =
    "mb-px flex w-full items-center gap-3 rounded-[10px] px-3 py-[11px] text-left text-[14.5px]";
  if (active) {
    // .mi.on — 현재 화면
    return (
      <div aria-current="page" className={`${base} bg-background font-bold text-foreground`}>
        <span className="inline-flex w-5 shrink-0 items-center justify-center text-[15px] text-primary">
          {icon}
        </span>
        {label}
        {count && <span className="ml-auto text-[11.5px] text-muted-foreground">{count}</span>}
      </div>
    );
  }
  if (label === "홈") {
    // 다른 화면(카드 상세 등)에서는 홈으로 실제 이동
    return (
      <Link href="/" className={`${base} text-ink-mid hover:bg-background`}>
        <span className="inline-flex w-5 shrink-0 items-center justify-center text-[15px] text-muted-foreground">
          {icon}
        </span>
        {label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-disabled="true"
      className={`${base} text-ink-mid hover:bg-background`}
    >
      <span className="inline-flex w-5 shrink-0 items-center justify-center text-[15px] text-muted-foreground">
        {icon}
      </span>
      {label}
      {count && <span className="ml-auto text-[11.5px] text-muted-foreground">{count}</span>}
    </button>
  );
}
