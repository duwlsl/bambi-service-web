"use client";

import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { Segments } from "@/components/home/post-card";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import { useMyReports } from "@/hooks/use-my-reports";
import { MOCK_FEED_END, MOCK_REPORTS_META, type ReportBadge } from "@/lib/mock/feed";

/**
 * [내 보고서] 탭 — 목업 data-feed="mine"(kb-meta + 날짜 그룹 + kb-card) + 상태 분기.
 * 목업 variants/home-my-reports-states.html 기준: success / empty(받은 보고서 없음) / error.
 * 로딩은 상위(home-screen HomeSkeleton)의 인증 복구 스켈레톤이 담당한다. member 에서만 렌더된다.
 *
 * 내 보고서(rep-*)는 개인 보고서라 상세 mock 이 없다 → 제목은 링크가 아니라 텍스트(죽은 링크 방지).
 */
export function FeedMine() {
  // 데이터 계층: 인증 확정 후 useMyReports 가 loading/success/empty/error 를 정규화한다(member 전용 마운트).
  const result = useMyReports();
  const retry = result.refetch;

  if (result.status === "loading") return <FeedSkeleton />;

  if (result.status === "error") {
    return (
      <StateView
        role="alert"
        className="min-h-[320px]"
        icon={<IconAlert />}
        title="내 보고서 목록을 불러오지 못했어요"
        description={
          <>
            일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요.
            <br />
            이미 생성된 보고서는 사라지지 않아요.
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
        title="아직 받은 보고서가 없어요"
        description={
          <>
            등록한 관심사와 관심 자료를 바탕으로 매일 아침 브리핑이 만들어져요.
            <br />
            관심 자료를 추가하면 다음 브리핑부터 반영돼요.
          </>
        }
      />
    );
  }

  const groups = result.data;
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

      {groups.map((group) => (
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
                {/* 개인 보고서라 상세 mock 없음 → 링크 아님(죽은 링크 방지). 계약 확정 후 개인 상세 연결. */}
                <span className="flex-1 text-[15px] leading-[1.45] font-bold tracking-[-0.01em] text-foreground">
                  {card.title}
                </span>
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
