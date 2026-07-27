"use client";

import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { PostCard } from "@/components/home/post-card";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import { useRecFeed } from "@/hooks/use-rec-feed";
import { MOCK_FEED_END } from "@/lib/mock/feed";

/**
 * [피드] 탭 — READY+PUBLIC 공개 보고서(mock) 렌더. 목업 data-feed="rec" 의 공개 포스트 + 피드 끝 + 상태 분기.
 * 목업 variants/home-feed-states.html 기준: success / empty / error.
 * 로딩은 상위(home-screen HomeSkeleton)의 인증 복구 스켈레톤이 담당한다.
 *
 * [피드]는 공개 전용이라 개인 "오늘 아침 브리핑(나만 보기)" 블록은 두지 않는다(개인 보고서는 [내 보고서] MemberFeed).
 * guest 는 PostCard 개인화 신호(추천 사유·보관 상태·본인 강조)를 숨긴다(§15). 인증 필요 액션은 requireAuth 가 게이트한다.
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
        description="일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요."
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
        description="새로운 공개 브리핑이 준비되면 이곳에 표시돼요."
        // 동작하지 않던 disabled '관심사 관리' CTA 제거. 실제 동작하는 '잠시 후 다시 확인'(retry)만 유지.
        actions={[{ label: "잠시 후 다시 확인", onClick: retry, variant: "primary" }]}
      />
    );
  }

  const posts = result.data;
  return (
    <div>
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
