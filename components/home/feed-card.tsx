"use client";

import Link from "next/link";

import { useCardVisibility } from "@/hooks/use-card-visibility";
import type { CardVisibility, FeedCardVM } from "@/types/feed";

/** 메타에 노출할 태그 최대 개수 — 나머지는 실제 남은 개수로 `+N` 표시한다. */
const VISIBLE_TAG_LIMIT = 2;

/**
 * [내 보고서] READY 카드 — 목업 `home-my-reports.html` 의 `.kb-card` 압축 구조를 따른다.
 *
 *   제목(최대 2줄, /report/{publicId} 링크)            [공개 범위 컨트롤]
 *   요약(최대 2줄)
 *   #태그 · 출처 N건 · 시각
 *
 * 목업 토큰: `.kb-card`(bg-card·border·radius 14·padding 15/18·mb 9) · `.krow1`(flex, gap 10) ·
 * `.t`(15px/700, line-height 1.45, tracking -.01em) · `.s`(13px, 1.6, mt 5) ·
 * `.m`(11.5px, gap 7, flex-wrap, mt 9) · `.kbadge`(11px/600, pill).
 *
 * 서버가 주는 값만 렌더한다. 이 카드에서 **제거한 것**: `whyForYou`, 출처 제목·외부 링크 전체 목록,
 * 카드 내부 긴 작성 날짜(상위 날짜 그룹이 보여준다), `MD 복사`, 목업의 report type 배지
 * (`아침 브리핑`·`온디맨드` — 서버에 해당 필드가 없다), 가짜 조회수·댓글 수·좋아요 수.
 * 자세한 정보는 `/report/{publicId}` 상세에서 확인한다.
 */
export function FeedCard({
  card,
  onVisibilityChanged,
}: {
  card: FeedCardVM;
  onVisibilityChanged: (publicId: string, visibility: CardVisibility) => void;
}) {
  const visibleTags = card.tags.slice(0, VISIBLE_TAG_LIMIT);
  const hiddenTagCount = card.tags.length - visibleTags.length;
  // 메타 구분점(·)은 **양쪽에 실제 항목이 있을 때만** 넣는다.
  const metaParts: string[] = [];
  if (card.sources.length > 0) metaParts.push(`출처 ${card.sources.length}건`);
  if (card.createdAtTimeLabel) metaParts.push(card.createdAtTimeLabel);
  const hasMeta = visibleTags.length > 0 || metaParts.length > 0;

  return (
    <article className="mb-[9px] rounded-[14px] border border-border bg-card px-[18px] py-[15px]">
      {/* .krow1 — 제목 + 공개 범위. 제목만 링크로 감싸고 토글과 중첩되지 않게 형제로 둔다. */}
      <div className="flex items-start gap-2.5">
        <h3 className="min-w-0 flex-1 text-[15px] leading-[1.45] font-bold tracking-[-0.01em] text-foreground">
          <Link
            href={`/report/${card.publicId}`}
            className="focus-ring line-clamp-2 rounded-[3px] hover:text-signal-ink"
          >
            {card.title}
          </Link>
        </h3>
        <VisibilityToggle card={card} onChanged={onVisibilityChanged} />
      </div>

      {/* .s — 요약 2줄. 빈 요약이면 영역을 생략한다. 긴 단어·URL 도 줄바꿈해 가로 스크롤을 막는다. */}
      {card.summary && (
        <p className="mt-[5px] line-clamp-2 text-[13px] leading-[1.6] break-words text-ink-mid">
          {card.summary}
        </p>
      )}

      {/* .m — 태그 · 출처 수 · 시각. 실제 값이 있는 항목만 렌더한다(빈 영역·`출처 0건` 금지). */}
      {hasMeta && (
        <div className="mt-[9px] flex flex-wrap items-center gap-[7px] text-[11.5px] text-muted-foreground">
          {visibleTags.map((tag) => (
            <span key={tag} className="break-all">
              #{tag}
            </span>
          ))}
          {hiddenTagCount > 0 && <span>+{hiddenTagCount}</span>}
          {visibleTags.length > 0 && metaParts.length > 0 && (
            <span aria-hidden="true" className="text-input">
              ·
            </span>
          )}
          {metaParts.map((part, i) => (
            <span key={part} className="flex items-center gap-[7px] whitespace-nowrap">
              {i > 0 && (
                <span aria-hidden="true" className="text-input">
                  ·
                </span>
              )}
              {part}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * 공개 범위 컨트롤 — 배지와 토글을 따로 두지 않고 **하나의 switch** 로 표현한다.
 *
 * `role="switch"` + `aria-checked` 로 현재 상태를 전달하고, 라벨에 보고서 제목을 넣어 목록에서
 * 어느 카드의 컨트롤인지 구분되게 한다. 상태는 색뿐 아니라 `공개`/`비공개` 텍스트로도 알린다.
 * 성공·실패는 `aria-live` 영역으로 전달하고, 실패해도 이 카드 안에서만 짧게 안내한다.
 * native `button` 이라 Enter/Space 가 기본 동작한다.
 */
function VisibilityToggle({
  card,
  onChanged,
}: {
  card: FeedCardVM;
  onChanged: (publicId: string, visibility: CardVisibility) => void;
}) {
  const { pending, failed, toggle } = useCardVisibility({
    publicId: card.publicId,
    visibility: card.visibility,
    onChanged,
  });
  const isPublic = card.visibility === "PUBLIC";
  const label = isPublic ? "공개" : "비공개";

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label={`${card.title} 공개 범위`}
        disabled={pending}
        onClick={toggle}
        className={`focus-ring inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[3px] text-[11px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50 ${
          isPublic
            ? "border-wash-strong bg-wash text-signal-ink"
            : "border-border bg-background text-muted-foreground hover:text-ink-mid"
        }`}
      >
        {label}
        {/* 스위치 트랙 — 상태를 색 외에 위 텍스트로도 전달하므로 여기는 장식이다. */}
        <span
          aria-hidden="true"
          className={`relative inline-block h-3 w-[22px] rounded-full transition-colors ${
            isPublic ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`absolute top-[2px] h-2 w-2 rounded-full bg-card transition-all ${
              isPublic ? "left-[12px]" : "left-[2px]"
            }`}
          />
        </span>
      </button>
      {/* 상태 변화·실패 안내 — 항상 mount 해 스크린리더가 변화를 놓치지 않게 한다. */}
      <span aria-live="polite" className="sr-only">
        {pending ? "공개 범위 변경 중" : `공개 범위 ${label}`}
      </span>
      {failed && (
        <span role="alert" className="text-[11px] leading-[1.5] text-destructive">
          변경하지 못했어요. 다시 눌러 주세요.
        </span>
      )}
    </div>
  );
}
