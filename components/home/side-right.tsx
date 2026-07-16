import { MOCK_SIGNALS, MOCK_TOPICS } from "@/lib/mock/feed";

/**
 * 우측 레일 — 목업 .side-r 1:1 (오늘의 핵심 신호 + 추천 토픽).
 * 토픽 칩·관심사 추가는 P1 → 시각 전용(aria-disabled).
 */
export function SideRight() {
  return (
    <aside className="sticky top-4 flex w-[300px] shrink-0 flex-col gap-3.5 max-[1240px]:hidden">
      {/* .rpanel — 오늘의 핵심 신호 */}
      <div className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
        <h4 className="mb-[15px] flex items-center text-[13px] font-bold text-foreground">
          오늘의 핵심 신호
        </h4>
        {MOCK_SIGNALS.map((sig, i) => (
          <div
            key={sig.n}
            className={`flex gap-2.5 border-t border-border py-[9px] ${i === 0 ? "border-t-0 pt-[3px]" : ""}`}
          >
            <span className="w-5 shrink-0 pt-px text-sm font-bold text-signal-ink">{sig.n}</span>
            <div>
              <div className="text-[12.5px] leading-[1.45] font-semibold text-foreground">
                {sig.title}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{sig.meta}</div>
            </div>
          </div>
        ))}
      </div>

      {/* .rpanel — 추천 토픽 */}
      <div className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
        <h4 className="mb-[15px] flex items-center text-[13px] font-bold text-foreground">
          추천 토픽
        </h4>
        <div className="flex flex-wrap gap-2">
          {MOCK_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              aria-disabled="true"
              className="rounded-full border border-border bg-background px-3 py-1.5 text-[12.5px] text-ink-mid"
            >
              {topic}
            </button>
          ))}
          {/* .tpc.plus */}
          <button
            type="button"
            aria-disabled="true"
            className="rounded-full border border-wash-strong bg-wash px-3 py-1.5 text-[12.5px] font-semibold text-signal-ink"
          >
            ＋ 관심사로 추가
          </button>
        </div>
      </div>
    </aside>
  );
}
