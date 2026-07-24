"use client";

import { FeedCard } from "@/components/home/feed-card";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import type { MemberFeedState } from "@/hooks/use-member-feed";

/**
 * member [피드] 탭 — GET /api/feed 실 데이터 렌더.
 * 상태(useMemberFeed)는 상위 HomeView 가 소유하고(저장 모달과 refetch 공유), 이 컴포넌트는
 * loading / empty / error / success 렌더만 담당한다. 상태 UI 는 기존 컴포넌트를 재사용한다
 * (FeedSkeleton · StateView). 인증 loading/error 는 상위 HomeSkeleton 담당(여기 도달하지 않음).
 */
export function MemberFeed({ feed }: { feed: MemberFeedState & { refetch: () => void } }) {
  if (feed.status === "loading") return <FeedSkeleton />;

  if (feed.status === "error") {
    return (
      <StateView
        role="alert"
        className="min-h-[320px]"
        icon={<IconAlert />}
        title="피드를 불러오지 못했어요"
        description="일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요."
        actions={[{ label: "다시 시도", onClick: feed.refetch, variant: "primary" }]}
      />
    );
  }

  if (feed.status === "empty") {
    return (
      <StateView
        className="min-h-[320px]"
        icon={<IconEmptyDoc />}
        title="아직 카드가 없어요"
        description="＋ 관심 자료에서 URL이나 내용을 저장하면 새 카드가 생성돼요."
      />
    );
  }

  return (
    <div>
      {feed.data.map((card) => (
        <FeedCard key={card.publicId} card={card} />
      ))}
      {/* .feed-end */}
      <div className="px-2.5 pt-5 pb-1.5 text-center text-muted-foreground">
        <div className="mb-1 text-[13.5px] font-bold text-ink-mid">오늘 카드는 여기까지예요</div>
        <div className="text-[12.5px] leading-[1.6]">
          관심 자료를 저장하면 다음 카드가 이 피드에 쌓여요.
        </div>
      </div>
    </div>
  );
}
