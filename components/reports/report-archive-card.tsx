"use client";

import Link from "next/link";

import { ReportTypeBadge } from "@/components/report/report-type-badge";
import { reportDetailHref } from "@/lib/report-origin";
import type { ArchiveItem } from "@/types/report-archive";

/** 메타에 노출할 태그 최대 개수 — 나머지는 실제 남은 개수로 `+N` 표시한다(홈 [내 보고서] 카드와 동일). */
const VISIBLE_TAG_LIMIT = 2;

/**
 * 아카이브 카드 — 목업 library.html `.kb-card` 기반.
 *
 *   제목 (/report/{publicId} 링크)
 *   [유형] [공개/비공개] #태그 #태그 +N · 출처 N건 · 시각
 *
 * **요약 본문을 두지 않는다**(2026-08-07 UI 검수). 목업 `.kb-card` 는 제목 + 메타 한 줄짜리 조밀한
 * 목록이고, 여기 요약 2줄이 들어가면서 카드가 홈 [내 보고서] 탭과 같은 밀도가 됐다 —
 * "전체 보기"는 쌓인 보고서를 훑고 찾는 화면이라 한 화면에 더 많이 들어오는 편이 낫다.
 * 요약은 검색 대상에서는 그대로 유지된다(`searchArchiveItems`) — 안 보일 뿐 검색은 된다.
 *
 * 메타는 전부 **실 응답 필드**다: 유형(reportType) · 공개 범위(visibility) · 태그(tags) ·
 * 출처 건수(sources) · 생성 시각(timeLabel). 값이 없는 항목은 스스로 빠지고, `tags` 키가 없는
 * 배포본에서는 태그만 빠진 채 나머지가 남는다(화면 안 깨짐).
 * 태그가 실측으로 비어 있을 때만 mock 메타 태그로 물러난다 — mock 모드(opt-in)의 디자인 확인용이다.
 *
 * 이 카드는 **`/reports` 전용**이다. 홈 [내 보고서] 카드(`components/home/feed-card.tsx`)는 요약을
 * 그대로 유지한다 — 홈은 최근 몇 건을 읽는 자리고 여기는 찾는 자리라 밀도 기준이 다르다.
 *
 * view="grid": 카드 높이가 지나치게 달라지지 않도록 제목을 2줄로 제한하고 메타를 하단에 고정한다.
 */
export function ReportArchiveCard({
  item,
  view = "list",
}: {
  item: ArchiveItem;
  view?: "list" | "grid";
}) {
  const isGrid = view === "grid";
  // 실측 태그 우선, 없을 때만 mock 메타 태그(mock 모드에서만 값이 있다).
  const tags = item.tags.length > 0 ? item.tags : (item.mock?.tags ?? []);
  const visibleTags = tags.slice(0, VISIBLE_TAG_LIMIT);
  const hiddenTagCount = tags.length - visibleTags.length;

  // 메타 구분점(·)은 **양쪽에 실제 항목이 있을 때만** 넣는다.
  const metaParts: string[] = [];
  if (item.sources.length > 0) metaParts.push(`출처 ${item.sources.length}건`);
  if (item.timeLabel) metaParts.push(item.timeLabel);

  const visibilityLabel = toVisibilityLabel(item.visibility);
  const hasMeta =
    item.reportType !== null ||
    visibilityLabel !== null ||
    visibleTags.length > 0 ||
    metaParts.length > 0;

  return (
    <article
      className={`rounded-[14px] border border-border bg-card px-5 py-4 ${
        isGrid ? "flex h-full min-w-0 flex-col" : "mb-2.5"
      }`}
    >
      {/* .krow1 .t */}
      <h3
        className={`text-[15px] leading-[1.45] font-bold tracking-[-0.01em] text-foreground ${
          isGrid ? "line-clamp-2" : ""
        }`}
      >
        {/* 아카이브(/reports) 전용 카드 — 상세의 뒤로가기가 `← 내 보고서 전체 보기로` 로 뜬다. */}
        <Link
          href={reportDetailHref(item.publicId, { token: "reports" })}
          className="focus-ring rounded-[3px] break-words hover:text-signal-ink"
        >
          {item.title}
        </Link>
      </h3>

      {/* .m — 메타 1줄. 배지와 일반 텍스트의 수직 중앙을 맞추려고 행은 leading-none 으로 두고
          항목을 h-[22px] inline-flex items-center 로 통일한다. 태그·구분점·시각은 한 그룹
          (whitespace-nowrap)으로 묶어 줄바꿈 시 `·` 가 다음 줄 첫머리에 단독으로 떨어지지 않는다. */}
      {hasMeta && (
        <div
          className={`flex flex-wrap items-center gap-x-[7px] gap-y-1 text-xs leading-none text-muted-foreground ${
            isGrid ? "mt-auto pt-2.5" : "mt-[9px]"
          }`}
        >
          <ReportTypeBadge reportType={item.reportType} size="archive" />
          {visibilityLabel !== null && <VisibilityBadge label={visibilityLabel} />}
          {visibleTags.map((tag) => (
            <span key={tag} className="inline-flex h-[22px] items-center break-all">
              #{tag}
            </span>
          ))}
          {hiddenTagCount > 0 && (
            <span className="inline-flex h-[22px] items-center">+{hiddenTagCount}</span>
          )}
          {visibleTags.length > 0 && metaParts.length > 0 && (
            <span aria-hidden="true" className="inline-flex h-[22px] items-center text-input">
              ·
            </span>
          )}
          {metaParts.map((part, i) => (
            <span key={part} className="inline-flex h-[22px] items-center gap-x-[7px] whitespace-nowrap">
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
 * 서버 `visibility` → 배지 문구. **서버 값이 PUBLIC·PRIVATE 일 때만** 문구를 만든다.
 * 어댑터가 값을 보정하지 않고 그대로 담기 때문에 계약이 깨진 응답에서는 null 이고, 그때 배지
 * 자체를 렌더하지 않는다 — 모르는 값을 한쪽으로 단정하지 않는다(홈 [내 보고서] 카드와 같은 규율).
 */
function toVisibilityLabel(visibility: ArchiveItem["visibility"]): string | null {
  if (visibility === "PUBLIC") return "공개";
  if (visibility === "PRIVATE") return "비공개";
  return null;
}

/**
 * 공개 상태 표시 — **읽기 전용**이다. button·switch 가 아니라 단순 `<span>` 이라 포커스도 클릭
 * 동작도 없다. 공개 전환은 영향이 큰 행동이라 목록에서 한 번의 클릭으로 되지 않게 두고,
 * 실제 변경은 카드 상세의 공유 모달이 담당한다.
 *
 * 상태는 색이 아니라 문구(`공개`/`비공개`)로 구분된다. 시각 차이는 목업 `.kbadge`(중립) ·
 * `.kbadge.od`(wash·signal-ink) 토큰 안에서만 준다(새 색 금지).
 */
function VisibilityBadge({ label }: { label: string }) {
  const isPublic = label === "공개";
  return (
    <span
      className={`inline-flex h-[22px] shrink-0 items-center rounded-full border px-2 text-[10.5px] font-semibold whitespace-nowrap ${
        isPublic
          ? "border-wash-strong bg-wash text-signal-ink"
          : "border-border bg-background text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}
