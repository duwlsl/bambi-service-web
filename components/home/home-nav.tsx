import { Orb } from "@/components/brand/orb";
import { MOCK_NAV } from "@/lib/mock/feed";

/**
 * 상단 nav — 목업 .nav 1:1.
 * 풀블리드: 배경·하단 보더는 브라우저 전체 폭, 내부(로고~프로필)는 1440px 중앙 정렬.
 * 실동작: "＋ 관심 자료"(모달 열기)만. 검색·알림·프로필은 P1 → 시각 전용(aria-disabled).
 */
export function HomeNav({ onAddOpen }: { onAddOpen: () => void }) {
  return (
    <nav className="border-b border-border bg-card">
      <div className="relative mx-auto flex h-[58px] max-w-[1440px] items-center gap-[18px] px-6">
      {/* .logo */}
      <div className="flex items-center gap-[9px]">
        <Orb size={26} />
        <span className="text-[17px] font-normal tracking-[.02em] text-foreground [font-family:Quicksand,sans-serif]">
          alphacatcher
        </span>
      </div>
      <div className="flex-1" />

      {/* .nav-search — P1(검색), 시각 전용 */}
      <div
        aria-disabled="true"
        className="absolute top-1/2 left-1/2 flex h-[38px] w-[596px] max-w-[calc(100%-380px)] -translate-x-1/2 -translate-y-1/2 items-center gap-[9px] rounded-[19px] border border-border bg-background px-[15px] text-[13px] text-muted-foreground"
      >
        {/* .sico */}
        <span className="relative h-[13px] w-[13px] shrink-0 rounded-full border-[1.5px] border-low after:absolute after:-right-1 after:-bottom-0.5 after:h-[1.5px] after:w-[5px] after:rotate-45 after:bg-low after:content-['']" />
        {MOCK_NAV.searchPlaceholder}
      </div>
      <div className="flex-1" />

      {/* .btn.signal.sm — 관심 자료 추가 모달 (실동작) */}
      <button
        type="button"
        onClick={onAddOpen}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary bg-primary px-3 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-primary-foreground hover:brightness-[.96]"
      >
        ＋ 관심 자료
      </button>

      {/* .nav-ico — 알림, P1 시각 전용 */}
      <button
        type="button"
        aria-disabled="true"
        title="알림"
        className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-card text-[15px] text-ink-mid"
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="h-[17px] w-[17px] fill-none stroke-current [stroke-width:1.6]"
        >
          <path d="M8 2c-1.6 0-2.8 1.3-2.8 2.9 0 2.8-1.1 4.1-1.9 4.8h9.4c-.8-.7-1.9-2-1.9-4.8C10.8 3.3 9.6 2 8 2z" strokeLinejoin="round" />
          <path d="M6.6 12.2a1.5 1.5 0 0 0 2.8 0" strokeLinecap="round" />
        </svg>
        {/* .badge */}
        <span className="absolute top-0.5 right-[3px] h-[7px] w-[7px] rounded-full border-2 border-card bg-primary" />
      </button>

      {/* .nav-avatar — 내 프로필, P1 시각 전용 */}
      <button
        type="button"
        aria-disabled="true"
        aria-label="내 프로필"
        title="내 프로필"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-input bg-background text-[12.5px] font-bold text-ink-mid"
      >
        {MOCK_NAV.avatarInitial}
      </button>
      </div>
    </nav>
  );
}
