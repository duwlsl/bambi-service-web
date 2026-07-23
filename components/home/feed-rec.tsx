"use client";

import Link from "next/link";

import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { PostCard } from "@/components/home/post-card";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import { useRecFeed } from "@/hooks/use-rec-feed";
import { MOCK_FEED_END, MOCK_TODAY } from "@/lib/mock/feed";

/**
 * [피드] 탭 — 목업 data-feed="rec"(오늘 브리핑 + 포스트 + 피드 끝) + 상태 분기.
 * 목업 variants/home-feed-states.html 기준: success / empty / error.
 * 로딩은 상위(home-screen HomeSkeleton)의 인증 복구 스켈레톤이 담당한다.
 *
 * guest: "오늘 아침 브리핑(나만 보기)" 개인 전용 패널을 숨긴다(§15 — 인증 전 개인정보 미노출).
 * 공개 포스트 카드는 유지한다.
 */
export function FeedRec({ guest = false }: { guest?: boolean }) {
  // 데이터 계층: 인증 확정 후 useRecFeed 가 loading/success/empty/error 를 정규화한다.
  // 인증 로딩은 상위(home-screen HomeSkeleton)가, 데이터 로딩은 여기 FeedSkeleton 이 담당한다.
  const result = useRecFeed();
  const retry = result.refetch;

  if (result.status === "loading") return <FeedSkeleton />;

  if (result.status === "error") {
    return (
      <StateView
        role="alert"
        className="min-h-[320px]"
        icon={<IconAlert />}
        title="피드를 불러오지 못했어요"
        description={
          <>
            일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요.
            <br />
            보고 있던 화면과 입력한 내용은 그대로 유지돼요.
          </>
        }
        actions={[{ label: "다시 시도", onClick: retry, variant: "primary" }]}
      />
    );
  }

  if (result.status === "empty") {
    return (
      <StateView
        className="min-h-[320px]"
        icon={<IconEmptyDoc />}
        title="지금 보여드릴 공개 브리핑이 없어요"
        description={
          <>
            추천할 콘텐츠가 아직 없거나 일시적으로 불러오지 못한 상태예요.
            <br />
            관심사를 조정하면 추천 범위가 넓어지고, 잠시 후 다시 확인할 수도 있어요.
          </>
        }
        // 관심사 관리 CTA 링크 연결은 보류(§15 — Wiki 라우트 P1, /wiki 하드코딩 금지) → 문구만 노출.
        actions={[
          { label: "관심사 관리", variant: "ghost", disabled: true },
          { label: "잠시 후 다시 확인", onClick: retry, variant: "primary" },
        ]}
      />
    );
  }

  const posts = result.data;
  return (
    <div>
      {/* .today — 개인 전용(나만 보기): guest 에게는 숨김 */}
      {!guest && (
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
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} guest={guest} />
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
