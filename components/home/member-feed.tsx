"use client";

import { FeedCard } from "@/components/home/feed-card";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import type { MemberFeedState } from "@/hooks/use-member-feed";

/**
 * member [내 보고서] 탭 — GET /api/feed 개인 데이터 렌더(추후 GET /reports/mine 으로 교체 예정).
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
        title="내 보고서를 불러오지 못했어요"
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
        title="아직 받은 보고서가 없어요"
        description="준비된 보고서를 여기에서 확인할 수 있어요."
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
        <div className="mb-1 text-[13.5px] font-bold text-ink-mid">오늘 보고서는 여기까지예요</div>
        <div className="text-[12.5px] leading-[1.6]">
          생성된 보고서가 내 보고서에 쌓여요.
        </div>
      </div>
    </div>
  );
}
