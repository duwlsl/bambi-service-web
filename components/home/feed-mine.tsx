import Link from "next/link";

import { Segments } from "@/components/home/post-card";
import { MOCK_FEED_END, MOCK_REPORT_GROUPS, MOCK_REPORTS_META, type ReportBadge } from "@/lib/mock/feed";

/**
 * [내 보고서] 탭 — 목업 data-feed="mine" 1:1 (kb-meta + 날짜 그룹 + kb-card).
 * 제목 클릭(상세 P0-4)·MD 복사·지식창고 링크는 연결 전 → 시각 전용.
 */
export function FeedMine() {
  return (
    <div>
      {/* .kb-meta */}
      <p className="mx-0.5 mt-0.5 mb-4 text-xs text-muted-foreground">
        <Segments segments={MOCK_REPORTS_META.parts} />
        <span aria-disabled="true" className="font-semibold text-signal-ink">
          {MOCK_REPORTS_META.linkLabel}
        </span>
        {MOCK_REPORTS_META.tail}
      </p>

      {MOCK_REPORT_GROUPS.map((group) => (
        <div key={group.label}>
          {/* .kb-group */}
          <div className="mx-0.5 mt-[18px] mb-[9px] flex items-baseline justify-between gap-2.5 text-[12.5px] font-bold text-muted-foreground">
            {group.label}
          </div>
          {group.cards.map((card) => (
            <div
              key={card.id}
              className="mb-[9px] rounded-[14px] border border-border bg-card px-[18px] py-[15px]"
            >
              {/* .krow1 */}
              <div className="flex items-start gap-2.5">
                {/* 제목 클릭 → 카드 상세(P0-4) */}
                <Link
                  href={`/report/${card.id}`}
                  className="flex-1 text-[15px] leading-[1.45] font-bold tracking-[-0.01em] text-foreground hover:text-signal-ink"
                >
                  {card.title}
                </Link>
                {/* .copy — MD 복사, 연결 전 시각 전용 */}
                <button
                  type="button"
                  aria-disabled="true"
                  title="마크다운 원문 복사"
                  className="shrink-0 rounded-[7px] border border-border px-[9px] py-1 text-[11.5px] font-semibold whitespace-nowrap text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  ⧉ MD 복사
                </button>
              </div>
              {/* .s */}
              <div className="mt-[5px] overflow-hidden text-[13px] leading-[1.6] text-ellipsis whitespace-nowrap text-ink-mid">
                {card.summary}
              </div>
              {/* .m */}
              <div className="mt-[9px] flex flex-wrap items-center gap-[7px] text-[11.5px] text-muted-foreground">
                {card.badges.map((badge) => (
                  <Badge key={badge.label} badge={badge} />
                ))}
                {card.meta.map((part, i) => (
                  <span key={`${card.id}-m${i}`} className="contents">
                    <span>{part}</span>
                    {i < card.meta.length - 1 && <span>·</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* .feed-end */}
      <div className="px-2.5 pt-5 pb-1.5 text-center text-muted-foreground">
        <div className="mb-1 text-[13.5px] font-bold text-ink-mid">{MOCK_FEED_END.mine.title}</div>
        <div className="text-[12.5px] leading-[1.6]">
          <Segments segments={MOCK_FEED_END.mine.subParts} />
        </div>
      </div>
    </div>
  );
}

/** .kbadge (+ .od / 공개 variant — 목업 인라인 스타일 그대로) */
function Badge({ badge }: { badge: ReportBadge }) {
  if (badge.variant === "od") {
    return (
      <span className="rounded-full border border-wash-strong bg-wash px-[9px] py-0.5 text-[11px] font-semibold text-signal-ink">
        {badge.label}
      </span>
    );
  }
  if (badge.variant === "public") {
    return (
      <span
        className="rounded-full border px-[9px] py-0.5 text-[11px] font-semibold"
        style={{
          color: "var(--ok)",
          borderColor: "rgba(52,166,106,.3)",
          background: "rgba(52,166,106,.08)",
        }}
      >
        {badge.label}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-border bg-background px-[9px] py-0.5 text-[11px] font-semibold text-muted-foreground">
      {badge.label}
    </span>
  );
}
