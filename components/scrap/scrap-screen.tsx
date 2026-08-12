"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { AddMaterialModal } from "@/components/home/add-material-modal";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { HomeNav } from "@/components/home/home-nav";
import { SideLeft } from "@/components/home/side-left";
import { ScrapRail } from "@/components/scrap/scrap-rail";
import { PageState } from "@/components/ui/page-state";
import { IconAlert } from "@/components/ui/state-icons";
import { useScraps } from "@/hooks/use-scraps";
import { unscrapCard } from "@/lib/repositories/scraps";
import { MOCK_SIDE_FOOT } from "@/lib/mock/feed";
import { reportDetailHref } from "@/lib/report-origin";
import type { ScrapCard } from "@/types/scrap";

const SCRAP_MENU_LABEL = "북마크";

const SCRAPPED_AT_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * 카드 하단에 노출할 태그 최대 개수 — 나머지는 실제 남은 개수로 `+N` 표시한다.
 * 홈 [내 보고서](`home/feed-card.tsx`) · 아카이브(`reports/report-archive-card.tsx`) 카드와 같은
 * 값이다. 담아둔 카드는 태그가 5개 넘게 오는 일이 흔한데, 전부 깔면 하단이 2~3줄로 불어나
 * 카드 높이가 태그 수에 끌려다닌다 — 320px 폭에서도 한 줄에 들어가는 선이 2개다.
 */
const VISIBLE_TAG_LIMIT = 2;

/**
 * 북마크(스크랩) — /scraps. member 전용(내 보관 목록 = 개인 데이터), 인증 4분기(§15).
 * 목업 saved.html 기준. 목록은 PUBLIC 카드와 **내 소유 PRIVATE 카드**(service-api #85)가 온다
 * (남의 카드가 비공개로 바뀌면 백엔드 자동 숨김). 공개 범위로 거르지 않는다 — 서버가 내려준
 * 목록을 그대로 보여준다.
 * 카드 제목·"보고서 열기"는 상세(/report/{publicId})로 간다 — 처음(07-31)엔 타인 공개 카드
 * 단건 API가 없어 링크를 안 달았지만, 08-04 타인·게스트 공개 카드 상세(#30)로 열렸다.
 * 내 PRIVATE 카드도 상세 권한이 "내 카드 or PUBLIC" 이라 그대로 열린다. 상세에서 404 를 만날 일은
 * 남의 카드가 비공개로 바뀐 직후 정도다(상세가 처리).
 * 조회수·좋아요 수는 이 API 응답에 없으므로 표기하지 않는다.
 */
export function ScrapScreen() {
  const { status, refreshAuth } = useAuth();

  if (status === "loading") return <ScrapSkeleton />;
  if (status === "error") {
    return (
      <Shell>
        <PageState
          role="alert"
          icon={<IconAlert />}
          title="로그인 상태를 확인하지 못했어요"
          description="네트워크가 불안정하거나 세션이 만료됐을 수 있어요."
          actions={[{ label: "다시 시도", onClick: () => void refreshAuth(), variant: "primary" }]}
        />
      </Shell>
    );
  }
  if (status === "guest") {
    return (
      <Shell guest>
        <PageState
          title="로그인하면 보관함을 볼 수 있어요"
          description="피드에서 마음에 드는 공개 보고서를 담아두고 다시 찾아보세요."
          actions={[
            { label: "가입하기", href: "/signup", variant: "primary" },
            { label: "로그인", href: "/login", variant: "ghost" },
          ]}
        />
      </Shell>
    );
  }
  return <ScrapView />;
}

/**
 * 공통 프레임 — 헤더 + 좌측 내비 + 본문 (+ 선택적 우측 rail).
 * 목업 shell(좌 300 · 본문 760 · 우 300)과 같은 3열 구조이며, rail 은 보여줄 실제 집계가 있을
 * 때만 상위가 넘긴다 — loading·error·guest 분기에서는 빈 칼럼조차 만들지 않는다.
 */
function Shell({
  children,
  guest = false,
  rail,
}: {
  children: React.ReactNode;
  guest?: boolean;
  rail?: React.ReactNode;
}) {
  const [amOpen, setAmOpen] = useState(false);
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <HomeNav onAddOpen={() => setAmOpen(true)} />
      <div className="mx-auto w-full max-w-[1440px] flex-1">
        <div className="flex min-h-full items-start justify-center gap-[22px] px-5 pt-6 pb-14">
          <SideLeft current={SCRAP_MENU_LABEL} footLines={MOCK_SIDE_FOOT} guest={guest} />
          <main className="flex min-h-[60dvh] min-w-0 max-w-[760px] flex-1 flex-col">{children}</main>
          {rail}
        </div>
      </div>
      <AddMaterialModal open={amOpen} onClose={() => setAmOpen(false)} />
    </div>
  );
}

function ScrapSkeleton() {
  return (
    <Shell>
      <FeedSkeleton />
    </Shell>
  );
}

function ScrapView() {
  const scraps = useScraps();
  // 해제 성공한 카드는 목록에서 즉시 숨긴다(재조회 없이). refetch 하면 초기화된다.
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set());

  const visible =
    scraps.status === "success" ? scraps.data.filter((c) => !removedIds.has(c.publicId)) : [];

  return (
    // rail 은 **화면에 실제로 남아 있는 목록**(보관 해제분 제외)으로 집계한다 —
    // 해제 직후 주제 빈도가 목록과 어긋나지 않는다. 태그가 없으면 ScrapRail 이 스스로 null 이다.
    <Shell rail={<ScrapRail cards={visible} />}>
      <header className="mb-8">
        <h1 className="text-[22px] font-bold tracking-[-0.015em] text-foreground">북마크</h1>
        <p className="mt-1 text-[13.5px] leading-[1.6] text-ink-mid">
          담아둔 공개 보고서를 다시 확인해요.
        </p>
      </header>

      {scraps.status === "loading" && <FeedSkeleton />}
      {scraps.status === "error" && (
        <div
          role="alert"
          className="rounded-[14px] border border-border bg-card px-5 py-6 text-center text-[13.5px] text-ink-mid"
        >
          보관함을 불러오지 못했어요.{" "}
          <button
            type="button"
            onClick={scraps.refetch}
            className="focus-ring rounded-[3px] font-semibold text-signal-ink"
          >
            다시 시도
          </button>
        </div>
      )}
      {(scraps.status === "empty" || (scraps.status === "success" && visible.length === 0)) && (
        <div className="rounded-[14px] border border-border bg-card px-5 py-8 text-center">
          <div className="mb-1 text-[13.5px] font-bold text-ink-mid">아직 담아둔 보고서가 없어요</div>
          <div className="text-[12.5px] leading-[1.6] text-muted-foreground">
            피드에서 마음에 드는 공개 보고서를 담아두면 여기에 쌓여요.
          </div>
        </div>
      )}
      {scraps.status === "success" &&
        visible.map((card) => (
          <ScrapItem
            key={card.publicId}
            card={card}
            onRemoved={() => setRemovedIds((cur) => new Set(cur).add(card.publicId))}
          />
        ))}
    </Shell>
  );
}

/**
 * 보관 카드 한 장 — **이 화면 전용**이다(모듈 밖으로 내보내지 않는다).
 *
 *   작성자 · 작성일                                    [⚑ 보관 해제]
 *   제목(최대 2줄, /report/{publicId} 링크)
 *   요약(최대 2줄)
 *   #태그 #태그 +N                                     보고서 열기
 *
 * 밀도는 홈 [내 보고서] 카드(`home/feed-card.tsx`)의 `.kb-card` 토큰에 맞춘다 —
 * padding 15/18 · 제목 15px/1.45 · 요약 13px/1.6(mt 5) · 하단 메타 mt 9 · 카드 간격 9.
 * 담아둔 목록도 "쌓아두고 훑는" 화면이라 한 화면에 더 들어오는 편이 낫다(2026-08-12 UI 검수).
 * 제목·요약을 2줄로 자르고 태그를 `VISIBLE_TAG_LIMIT` 로 끊는 것도 같은 이유다 — 카드 높이가
 * 내용 길이에 끌려다니지 않는다. **토큰만 맞췄을 뿐 feed-card 를 재사용하지는 않는다**:
 * 저쪽은 내 카드 전용이라 생성 종류·공개 범위 배지를 달고 작성자를 안 보여준다.
 *
 * `보고서 열기`는 제목과 같은 `/report/{publicId}` 로 가지만 **지우지 않는다** — 이 카드에는
 * 전체 클릭 핸들러가 없어서(article 은 그냥 컨테이너다) 지우면 진입점이 제목 링크 하나로 줄고,
 * 목업 saved.html 의 명시적 CTA 도 사라진다. 대신 하단 태그 줄 오른쪽으로 옮겨 줄 하나를 아꼈다.
 */
function ScrapItem({ card, onRemoved }: { card: ScrapCard; onRemoved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const at = formatScrappedAt(card.createdAt);
  const authorName = card.author.displayName?.trim() || "사용자";
  // 상세 진입 — 공개 피드 카드(public-feed-card)와 같은 경로·패턴.
  // 진입 출처는 `scraps` 라 상세의 뒤로가기가 `← 북마크로` 로 뜨고 이 화면으로 되돌아온다.
  const detailHref = reportDetailHref(card.publicId, { token: "scraps" });
  const visibleTags = card.tags.slice(0, VISIBLE_TAG_LIMIT);
  const hiddenTagCount = card.tags.length - visibleTags.length;

  function remove() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    unscrapCard(card.publicId)
      .then(() => onRemoved())
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  }

  return (
    <article className="mb-[9px] rounded-[14px] border border-border bg-card px-[18px] py-[15px]">
      {/* 작성자·작성일 + 보관 해제 — 항상 한 줄. 버튼은 배지와 같은 h-[22px] 라 이 줄이 텍스트
          한 줄보다 높아지지 않는다. 줄임(truncate)은 **이름 쪽에만** 건다: 바깥 칸에 걸면
          overflow:hidden 이 조상이 되어 작성자 링크의 focus-ring(outline)까지 잘리고, 긴 이름이
          작성일을 통째로 밀어내 버린다. 이름만 줄이면 포커스 링이 온전하고 작성일도 남는다. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-1 text-[11.5px] text-muted-foreground">
          {card.author.publicId ? (
            <Link
              href={`/users/${card.author.publicId}`}
              className="focus-ring truncate rounded-[3px] font-semibold text-ink-mid hover:text-signal-ink"
            >
              {authorName}
            </Link>
          ) : (
            <span className="truncate font-semibold">{authorName}</span>
          )}
          {at && <span className="shrink-0 whitespace-nowrap">· {at} 작성</span>}
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="focus-ring inline-flex h-[22px] shrink-0 items-center rounded-[8px] border border-border px-2 text-[11px] text-ink-mid hover:bg-background hover:text-foreground disabled:opacity-50"
        >
          {busy ? "해제 중…" : "⚑ 보관 해제"}
        </button>
      </div>

      {/* 제목 = 상세 링크 (피드 카드와 동일 관례 — hover 시 signal 색으로 눌리는 것임을 알린다) */}
      <h3 className="mt-[7px] text-[15px] leading-[1.45] font-bold tracking-[-0.01em] text-foreground">
        <Link
          href={detailHref}
          className="focus-ring line-clamp-2 rounded-[3px] break-words hover:text-signal-ink"
        >
          {card.title}
        </Link>
      </h3>

      {/* 요약 2줄. 빈 요약이면 영역을 생략한다(빈 줄만큼 카드가 커지지 않게). */}
      {card.summary && (
        <p className="mt-[5px] line-clamp-2 text-[13px] leading-[1.6] break-words text-ink-mid">
          {card.summary}
        </p>
      )}

      {/* 하단 한 줄 — 왼쪽 태그, 오른쪽 `보고서 열기`. 태그가 없어도 왼쪽 칸은 남겨 CTA 자리를
          고정한다. 좁은 폭에서 겹치지 않도록 태그 칸만 줄어들고(min-w-0) CTA 는 shrink-0 이다. */}
      <div className="mt-[9px] flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="max-w-full truncate rounded-full bg-background px-2 py-[2px] text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 && (
            <span className="shrink-0 text-[11px] text-muted-foreground">+{hiddenTagCount}</span>
          )}
        </div>
        <Link
          href={detailHref}
          className="focus-ring shrink-0 rounded-[3px] text-[11.5px] font-semibold text-muted-foreground hover:text-signal-ink"
        >
          보고서 열기
          <span className="sr-only"> — {card.title}</span>
        </Link>
      </div>

      {failed && (
        <p role="alert" className="mt-2 text-[12px] text-destructive">
          해제하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </article>
  );
}

function formatScrappedAt(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  return SCRAPPED_AT_FORMAT.format(new Date(ts));
}
