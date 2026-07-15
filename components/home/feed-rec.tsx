import Link from "next/link";

import { PostCard } from "@/components/home/post-card";
import { MOCK_FEED_END, MOCK_POSTS, MOCK_TODAY } from "@/lib/mock/feed";

/**
 * [피드] 탭 — 목업 data-feed="rec" 1:1 (오늘 브리핑 + 포스트 5건 + 피드 끝).
 * "자세히 보기"·제목 클릭 → 카드 상세(P0-4)는 다음 구현 → 시각 전용.
 */
export function FeedRec() {
  return (
    <div>
      {/* .today */}
      <div className="mb-4 rounded-[14px] border border-[var(--today-line)] bg-[var(--today-bg)] px-[18px] py-4">
        {/* .th */}
        <div className="mb-[11px] flex items-center gap-2">
          <span className="inline-flex h-4 w-4 shrink-0">
            <TodaySun />
          </span>
          <span className="text-[12.5px] font-bold tracking-[.01em] text-ink-mid">
            {MOCK_TODAY.label}
          </span>
          <span className="text-[11.5px] text-muted-foreground">{MOCK_TODAY.time}</span>
          <span className="ml-auto rounded-full border border-border bg-card px-2.5 py-[3px] text-[11px] text-muted-foreground">
            {MOCK_TODAY.privacy}
          </span>
        </div>
        <div className="mb-2 text-lg leading-[1.45] font-bold text-foreground">
          <Link href="/report/today" className="hover:text-signal-ink">
            {MOCK_TODAY.title}
          </Link>
        </div>
        <p className="mb-3 text-[13.5px] leading-[1.7] text-ink-mid">{MOCK_TODAY.summary}</p>
        {/* .tfoot */}
        <div className="flex flex-wrap items-center gap-[7px]">
          {MOCK_TODAY.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[7px] border border-border bg-card px-[9px] py-[3px] text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          <Link href="/report/today" className="ml-auto text-[13px] font-semibold text-signal-ink">
            {MOCK_TODAY.moreLabel}
          </Link>
        </div>
      </div>

      {MOCK_POSTS.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* .feed-end */}
      <div className="px-2.5 pt-5 pb-1.5 text-center text-muted-foreground">
        <div className="mb-1 text-[13.5px] font-bold text-ink-mid">{MOCK_FEED_END.rec.title}</div>
        <div className="text-[12.5px] leading-[1.6]">{MOCK_FEED_END.rec.sub}</div>
      </div>
    </div>
  );
}

/** .today .sun (16px) */
function TodaySun() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="8" cy="8" r="3.2" className="fill-primary" />
      <g className="stroke-primary" strokeWidth={1.4} strokeLinecap="round">
        <line x1="8" y1="1.5" x2="8" y2="3" />
        <line x1="8" y1="13" x2="8" y2="14.5" />
        <line x1="1.5" y1="8" x2="3" y2="8" />
        <line x1="13" y1="8" x2="14.5" y2="8" />
      </g>
    </svg>
  );
}
