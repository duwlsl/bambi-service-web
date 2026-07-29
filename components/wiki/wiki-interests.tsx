"use client";

import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import type { WikiInterestsState } from "@/hooks/use-wiki-interests";
import type { WikiTag } from "@/types/wiki";

/**
 * [AI가 이해한 관심사] 섹션 — 데이터는 자동추출 관심 태그(GET /api/wiki/tags)다.
 * 각 태그는 선택 가능(하단 [내가 저장한 자료]를 documentIds 로 필터).
 * score 는 "상대 관심 강도"(최상위 대비)로만 표기하고 절대 관심도로 오해되지 않게 한다.
 * confidence 는 화면에 노출하지 않으므로 화면 모델에도 담지 않는다.
 * 이 화면의 관심사는 모두 LLM(Agent) 추론이라 출처 배지는 'LLM 추론'만 표시한다('직접 설정'은 향후 병합 예정).
 */
export function WikiInterests({
  state,
  selectedId,
  onSelect,
}: {
  state: WikiInterestsState & { refetch: () => void };
  selectedId: string | null;
  onSelect: (tagId: string) => void;
}) {
  return (
    <section aria-label="AI가 이해한 관심사" className="mb-8">
      <h2 className="mb-1 text-[17px] font-bold tracking-[-0.01em] text-foreground">
        AI가 이해한 관심사
      </h2>
      <p className="mb-4 text-[13px] leading-[1.6] text-ink-mid">
        관심사를 선택하면 아래에서 관련 자료만 볼 수 있어요.
      </p>

      {state.status === "loading" && <FeedSkeleton />}

      {state.status === "error" && (
        <StateView
          role="alert"
          className="min-h-[240px]"
          icon={<IconAlert />}
          title="관심사를 불러오지 못했어요"
          description="일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요."
          actions={[{ label: "다시 시도", onClick: state.refetch, variant: "primary" }]}
        />
      )}

      {state.status === "empty" && (
        <StateView
          className="min-h-[240px]"
          icon={<IconEmptyDoc />}
          title="아직 파악한 관심사가 없어요"
          description="관심 자료를 저장하면 AI가 관심사를 파악해 여기에 정리해요."
        />
      )}

      {state.status === "success" && (
        <div className="flex flex-col gap-3">
          {state.data.map((wikiTag) => (
            <InterestCard
              key={wikiTag.tagId}
              wikiTag={wikiTag}
              active={wikiTag.tagId === selectedId}
              onSelect={() => onSelect(wikiTag.tagId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InterestCard({
  wikiTag,
  active,
  onSelect,
}: {
  wikiTag: WikiTag;
  active: boolean;
  onSelect: () => void;
}) {
  // 계약상 score 는 0~1 — 화면 단계에서만 범위를 방어하고 0~100%로 변환한다(응답 원본 미변형).
  const strengthPct = Math.max(0, Math.min(100, Math.round(wikiTag.score * 100)));
  const tier = scoreTier(strengthPct);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`focus-ring rounded-[14px] border bg-card px-[18px] py-4 text-left transition-colors ${
        active ? "border-wash-strong ring-1 ring-wash-strong" : "border-border hover:border-wash-strong"
      }`}
    >
      {/* button 안은 phrasing content 만 허용된다(div·ul·li 금지) — 레이아웃은 span + Tailwind display 로 만든다. */}
      <span className="flex items-start gap-2">
        <span className="flex-1 text-[15px] leading-[1.4] font-bold tracking-[-0.01em] text-foreground">
          {wikiTag.tag}
        </span>
        {/* category 는 값이 있을 때만 보조 칩으로 — null·빈 문자열(어댑터에서 null 정규화)은 칩 자체를 숨긴다 */}
        {wikiTag.category !== null && (
          <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] whitespace-nowrap text-muted-foreground">
            {wikiTag.category}
          </span>
        )}
        {/* 출처 배지 — 전부 LLM 추론(직접 설정 배지 없음). 브랜드 accent(wash+signal-ink)로 중립 category 칩과 구분,
            라이트/다크 모두 토큰에 대비값이 정의돼 있다. status(초록/빨강) 신호 아님. */}
        <span className="shrink-0 rounded-full border border-wash-strong bg-wash px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-signal-ink">
          LLM 추론
        </span>
      </span>

      {/* 상대 관심 강도 — 절대 관심도로 오해되지 않도록 문구를 명시한다 */}
      <span className="mt-3 block">
        <span className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
          <span className="text-ink-mid">
            상대 관심 강도 <b className="font-bold text-signal-ink">{strengthPct}%</b>
          </span>
          <span className="text-muted-foreground">최상위 관심사 대비</span>
        </span>
        <span
          className="block h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          aria-hidden="true"
        >
          <span className={`block h-full rounded-full ${TIER_BAR_CLASS[tier]}`} style={{ width: `${strengthPct}%` }} />
        </span>
      </span>

      {/* 근거 — 노출 허용 코드만 문구로 변환돼 넘어온다. 부정 신호·미상 코드가 걸러져 비면 줄 자체를 숨긴다. */}
      {wikiTag.reasonMessages.length > 0 && (
        <span className="mt-2.5 flex flex-col gap-1">
          {wikiTag.reasonMessages.map((message, i) => (
            <span key={`${wikiTag.tagId}-r${i}`} className="flex gap-1.5 text-[12.5px] leading-[1.5] text-ink-mid">
              <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{message}</span>
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

/** 관심 강도 구간 — 임계는 여기 한 곳에만 둔다(화면 clamp된 0~100% 기준). 색만으로 의미를 전달하지 않으므로 퍼센트와 함께 쓴다. */
type ScoreTier = "high" | "medium" | "low";

function scoreTier(pct: number): ScoreTier {
  if (pct >= 75) return "high"; // score >= 0.75
  if (pct >= 40) return "medium"; // 0.40 <= score < 0.75
  return "low"; // score < 0.40
}

/** 구간별 바 fill — high: 브랜드 signal 주황 / medium: 연한 주황(피치) / low: 중립 회색(오류·부정 아님). */
const TIER_BAR_CLASS: Record<ScoreTier, string> = {
  high: "bg-primary",
  medium: "bg-primary/50",
  low: "bg-muted-foreground/50",
};
