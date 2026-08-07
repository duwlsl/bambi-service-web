"use client";

import Link from "next/link";

import { useRequireAuth } from "@/components/auth/use-require-auth";
import { PostMoreMenu } from "@/components/home/post-more-menu";
import { CardScrapButton } from "@/components/report/card-scrap-button";
import { useCardLike } from "@/hooks/use-card-like";
import type { PublicFeedSocialVM } from "@/types/feed";
import type { AuthorCardVM } from "@/types/profile";

/**
 * 프로필의 공개 브리핑 카드 — 목업 `profile-user.html` 의 `.post` 를 따른다.
 *
 * 홈의 `PublicFeedCard` 를 통째로 가져오지 않고 프로필 전용으로 둔다. 같은 서버 DTO
 * (`PublicCardResponse`)를 쓰지만 두 화면의 정보 위계가 다르고(피드는 "누가 썼나"가 먼저, 프로필은
 * 이미 그 사람 페이지다), 무엇보다 공개 피드 계약 작업과 파일이 겹치지 않게 하려는 것이다.
 * 정규화는 같은 함수를 공유한다(lib/adapters/profile.ts → lib/adapters/card.ts).
 *
 * 정보 위계(목업 `.post`):
 *   아바타 | 표시이름 @핸들            ⋯
 *          | 작성 시각 · 공개 브리핑
 *   제목(상세 링크)
 *   요약
 *   ─────────
 *   ⚑ 보관 · ♡ 좋아요 수 · 출처 N건
 *
 * **목업에 있지만 계약에 없어 만들지 않는 것**: 댓글 수(카드 DTO 에 없음 — 목록 API 는 카드별·인증
 * 필수), 조회수(백엔드 전무). 숫자를 지어내지 않는다.
 *
 * **태그 chip 도 두지 않는다** — 목업 프로필 카드에는 태그가 없다(홈 피드 카드에만 있다).
 * `tags` 는 우측 rail 의 「주로 다루는 주제」 집계에만 쓴다.
 *
 * 작성자 줄은 **링크로 만들지 않는다.** 지금 보고 있는 프로필의 주인과 같은 사람이라 자기 자신으로
 * 가는 링크가 된다. 아바타·이름은 카드가 어디에 퍼가도 맥락을 잃지 않게 표시만 한다.
 *
 * 공유는 카드 우상단 `⋯`(`PostMoreMenu`)가 담당한다 — 홈 피드 카드가 이미 쓰는 그 메뉴 그대로다
 * (`링크 복사` · 지원 브라우저에서 `다른 앱으로 공유`). 프로필용 공유 UI 를 새로 만들지 않는다.
 */
export function AuthorCardItem({ card }: { card: AuthorCardVM }) {
  const detailHref = `/report/${card.publicId}`;
  const name = card.author.displayName ?? card.author.username ?? null;

  return (
    <article className="mb-4 rounded-[14px] border border-border bg-card px-[18px] pt-4 pb-[7px]">
      {/* .phead — 작성자 + 작성 시각. 이름이 하나도 없으면(탈퇴 작성자) 이름 줄 없이 시각만 남긴다. */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-wash text-[15px] font-bold text-signal-ink"
          >
            {card.author.initial ?? ""}
          </span>
          <div className="min-w-0">
            {name !== null && (
              <div className="truncate text-sm font-bold text-foreground">
                {name}
                {card.author.username !== null && (
                  <span className="ml-1.5 text-[13px] font-normal text-muted-foreground">
                    @{card.author.username}
                  </span>
                )}
              </div>
            )}
            <div className="truncate text-xs text-muted-foreground">
              {card.createdAtLabel === "" ? "공개 브리핑" : `${card.createdAtLabel} · 공개 브리핑`}
            </div>
          </div>
        </div>
        <PostMoreMenu publicId={card.publicId} title={card.title} />
      </div>

      {/* 목업의 2단 — 본문이 아바타 오른쪽 라인(38 + gap 10 = 48px)에서 시작한다.
          좁은 화면에서는 본문 폭을 깎지 않도록 sm 이상에서만 준다(홈 피드 카드와 같은 규칙). */}
      <div className="sm:pr-12 sm:pl-12">
        <h3 className="mb-2 text-lg leading-[1.45] font-bold tracking-[-0.01em] text-foreground">
          <Link
            href={detailHref}
            className="focus-ring line-clamp-3 rounded-[3px] break-words hover:text-signal-ink"
          >
            {card.title}
          </Link>
        </h3>

        {card.summary !== "" && (
          <p className="mb-2.5 line-clamp-3 text-sm leading-[1.7] break-words text-ink-mid">
            {card.summary}
          </p>
        )}

        {/*
          .pacts — 실제로 동작하는 것만 둔다. 값을 모르는 액션(social·scrapped 가 null)은 그 칸을
          비운다: 0·false 로 덮으면 "좋아요 0개"·"담지 않음"을 단정하게 된다.
          출처는 건수만(전체 목록은 카드 상세에 있다).
        */}
        <div className="flex flex-wrap items-center gap-1 border-t border-border pt-1">
          {card.scrapped !== null && (
            <CardScrapButton
              publicId={card.publicId}
              initialScrapped={card.scrapped}
              title={card.title}
            />
          )}
          {card.social !== null && (
            <CardLikeChip publicId={card.publicId} social={card.social} title={card.title} />
          )}
          {card.sources.length > 0 && (
            <span className="px-[11px] py-[9px] text-[12.5px] text-muted-foreground">
              출처 {card.sources.length}건
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * 액션바 좋아요 토글 — 목록용 칩 크기(`.pact`)만 다르고 동작은 카드 상세와 **같은 훅**이다
 * (`useCardLike` — 서버 확정값 반영 · 낙관적 증감 없음 · 연타 방어).
 *
 * PUBLIC 카드는 작성자 본인을 포함한 모든 로그인 사용자가 누를 수 있다(서버도 소유자를 막지 않는다).
 * 게스트 클릭은 requireAuth 가 GuestGateModal 로 가로챈다 → /like 요청이 나가지 않는다.
 * 목록이라 버튼 이름만으로 대상을 알 수 없어 제목을 sr-only 로 덧댄다(같은 줄 `보관` 과 같은 규율).
 */
function CardLikeChip({
  publicId,
  social,
  title,
}: {
  publicId: string;
  social: PublicFeedSocialVM;
  title: string;
}) {
  const { requireAuth } = useRequireAuth();
  const { liked, likeCount, busy, failed, toggle } = useCardLike(publicId, social);

  return (
    <>
      <button
        type="button"
        onClick={() => requireAuth(toggle)}
        disabled={busy}
        aria-pressed={liked}
        aria-busy={busy}
        className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] disabled:opacity-50 ${
          liked ? "text-signal-ink" : "text-muted-foreground hover:bg-background hover:text-ink-mid"
        }`}
      >
        <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
        {liked ? "좋아요 취소" : "좋아요"}
        <b className={`font-semibold ${liked ? "text-signal-ink" : "text-ink-mid"}`}>{likeCount}</b>
        <span className="sr-only"> — {title}</span>
      </button>

      {/* 진행·실패를 한 live region 으로 합친다. 서버 error.message 원문은 노출하지 않는다. */}
      <span
        role="status"
        aria-live="polite"
        className={`text-[11.5px] ${failed ? "text-ink-mid" : "sr-only"}`}
      >
        {busy ? "처리 중…" : failed ? "잠시 후 다시 시도해 주세요" : ""}
      </span>
    </>
  );
}
