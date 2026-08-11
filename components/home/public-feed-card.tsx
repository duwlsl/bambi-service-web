"use client";

import Link from "next/link";

import { useRequireAuth } from "@/components/auth/use-require-auth";
import { PostMoreMenu } from "@/components/home/post-more-menu";
import { CardScrapButton } from "@/components/report/card-scrap-button";
import { useCardLike } from "@/hooks/use-card-like";
import type { PublicFeedAuthorVM, PublicFeedCardVM, PublicFeedSocialVM } from "@/types/feed";

/**
 * 공개 피드 카드 — GET /api/feed/public(PublicCardResponse) 실데이터 전용.
 *
 * 정보 위계는 목업 `docs/design-handoff/product/home-feed.html` 의 `.post` 를 따른다:
 *
 *   아바타 | 표시이름 @핸들               ⋯
 *          | 작성 시각
 *   제목 (상세 링크)
 *   요약 2줄 + 더 보기
 *   ● 관심사 ‘첫 태그’ +N · 출처 N건
 *   ─────────────
 *   ⚑ 보관 · ♡ 좋아요 수
 *
 * 목업 토큰: `.post`(bg-card·border·radius 14·padding 16/18/7·mb 16) · `.phead`(gap 10, mb 6) ·
 * `.pav`(38px 원형) · `.pname`(14px/700, 핸들 `.h` 13px/400 ink-dim) · `.pmeta`(12px ink-dim) ·
 * `.ptitle`(18px/700, 1.45, -.01em, mb 8) · `.pbody`(14px, 1.7, mb 10) · `.showmore`(600 ink-dim) ·
 * `.reason`(12px, gap 8, dot 5px signal, mb 12) · `.pacts`(border-top, mt/pt 4) · `.pact`(12.5px, 9/11).
 *
 * 목업의 2단 구조(`.post>*:not(.phead){margin-left:48px}` — 본문이 아바타 오른쪽 라인에서 시작)를
 * 그대로 지킨다: 아바타(38) + gap(10) = 48px 이며, 좁은 화면에서 본문 폭을 깎지 않도록 `sm` 이상에서만
 * 준다. **제목·요약의 시작선은 작성자 이름과 같아야 한다** — 한 번 걷어냈다가 되돌렸다(2026-08-07
 * UI 검수): 들여쓰기를 없애면 본문이 아바타 아래로 파고들어 카드의 두 단 구조가 무너진다.
 *
 * **목업에 있지만 계약에 없어 만들지 않는 것**(가짜 UI 금지): `트리거 충족` 문구, 댓글 수·댓글 액션,
 * ⋯ 메뉴, `내 브리핑에서 공유` 출처 문구, "본인(isMe)" 아바타 강조, 조회수.
 *
 * 보관(스크랩) 토글은 service-api #53 이 `PublicCardResponse.scrapped`(조회자 기준 boolean)를
 * 내려주면서 **실제 상태로 연결됐다**(2026-08-07 실측). 예고한 대로 액션바 첫 칸에 들어간다.
 * 값이 검증되지 않는 카드(`scrapped === null`)에는 여전히 버튼을 두지 않는다 — 상태를 모르는
 * 토글은 이미 담아둔 카드를 클릭 한 번에 해제시킨다.
 *
 * **출처는 목록에서 건수만** 보여준다(이전에는 제목·외부 링크 전체 목록을 폈다). 카드가 "요약 목록"
 * 이 아니라 "본문 미리보기"처럼 보이던 주된 원인이라 접었을 뿐, 데이터는 그대로 두었고 전체 목록은
 * 기존 카드 상세(`/report/{publicId}`)에서 그대로 확인할 수 있다.
 *
 * 좋아요는 카드 상세·프로필 카드와 **같은 훅**(`useCardLike`)으로 토글된다(2026-08-11). 낙관적
 * 증감 없이 서버 확정값만 반영하고, 인증 게이트·연타 방어·실패 처리는 모두 훅·`useRequireAuth` 가
 * 담당한다 — 이 파일은 새 API·상태를 만들지 않는다. 값이 검증을 통과하지 못하면(`social === null`)
 * 좋아요 영역만 빼고 카드는 정상 렌더한다.
 *
 * 링크는 서로 중첩되지 않게 **형제로만** 둔다: 작성자 프로필 · 제목(상세) · 더 보기(상세) · `⋯`
 * 메뉴. 카드 전체를 링크로 감싸지 않는다.
 *
 * **공유는 카드 우상단 `⋯` 메뉴**(`PostMoreMenu`)가 담당한다 — 목업이 `⋯` 를 두었던 자리다.
 * 액션바 마지막 칸에 있을 때는 보관·좋아요와 성격이 다른데도 같은 줄에 묻혔고, 결과 문구가
 * 액션바 오른쪽 끝 작은 회색 텍스트라 복사됐는지 알기 어려웠다(2026-08-07 UI 검수).
 * 메뉴 항목은 `링크 복사` · `다른 앱으로 공유`(Web Share 지원 시) 둘이고 결과는 하단 토스트가 알린다.
 */
export function PublicFeedCard({ card }: { card: PublicFeedCardVM }) {
  const detailHref = `/report/${card.publicId}`;
  // 관심사는 **첫 태그만** 문구로 세우고 나머지는 개수로 접는다(목업 `.reason` 한 줄 유지).
  const [primaryTag, ...restTags] = card.tags;
  const sourceCount = card.sources.length;
  const hasMeta = primaryTag !== undefined || sourceCount > 0;

  return (
    <article className="mb-4 rounded-[14px] border border-border bg-card px-[18px] pt-4 pb-[7px]">
      {/*
        .phead — 작성자 + 작성 시각. `author.publicId` 가 UUID 로 검증됐을 때만 아바타·이름을 감싸
        `/users/{publicId}` 공개 프로필로 이동한다(어댑터가 형식을 확인한다).
        검증되지 않았거나 이름이 없으면 링크 없는 중립 표시로 남긴다 — 죽은 링크·가짜 이름·가짜
        핸들을 만들지 않는다. 팔로우 토글은 프로필 화면에 이미 있으므로 카드에 두지 않는다.
        목업 우상단 `⋯`(.pmore) 자리에는 공유 메뉴(`PostMoreMenu`)가 들어간다.
      */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {card.author.publicId !== null ? (
          <Link
            href={`/users/${card.author.publicId}`}
            className="focus-ring group flex min-w-0 items-center gap-2.5 rounded-[10px]"
          >
            <AuthorAvatar initial={card.author.initial} />
            <AuthorText author={card.author} createdAtLabel={card.createdAtLabel} />
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <AuthorAvatar initial={card.author.initial} />
            <AuthorText author={card.author} createdAtLabel={card.createdAtLabel} />
          </div>
        )}
        <PostMoreMenu publicId={card.publicId} title={card.title} />
      </div>

      {/* 목업의 2단 — 본문이 아바타 오른쪽 라인(48px), 즉 작성자 이름과 같은 선에서 시작한다.
          오른쪽도 같은 48px 을 비워 본문 덩어리를 카드 안에서 좌우 대칭으로 앉힌다(2026-08-07
          UI 검수) — 왼쪽만 들여쓰면 카드 오른쪽 테두리에 본문이 붙어 오른쪽으로 쏠려 보였다.
          모바일에서는 폭을 우선해 양쪽 다 주지 않는다. */}
      <div className="sm:pr-12 sm:pl-12">
        {/*
          .ptitle — 카드에서 가장 강한 정보. 상세 진입(/report/{publicId})이고, 어댑터가 UUID
          형식을 검증한 값만 온다. 아주 긴 제목이 카드를 삼키지 않게 3줄로 자른다(전문은 상세에 있다).
        */}
        <h3 className="mb-2 text-lg leading-[1.45] font-bold tracking-[-0.01em] text-foreground">
          <Link
            href={detailHref}
            className="focus-ring line-clamp-3 rounded-[3px] break-words hover:text-signal-ink"
          >
            {card.title}
          </Link>
        </h3>

        {/*
          .pbody — 요약 2줄. 목록 카드에서 본문 전체를 펴지 않는다. 요약이 없으면 이 영역과
          `더 보기` 를 함께 생략한다(빈 줄·의미 없는 링크 금지).
          `더 보기` 는 clamp 에 잘리지 않도록 문단 밖 형제로 두고, 목업 `.showmore` 처럼 별도 버튼이
          아니라 조용한 링크로 남긴다. 링크 이름만으로 목적지를 알 수 있게 제목을 sr-only 로 덧댄다.
        */}
        {card.summary && (
          <>
            <p className="line-clamp-2 text-sm leading-[1.7] break-words text-ink-mid">
              {card.summary}
            </p>
            <Link
              href={detailHref}
              className="focus-ring mt-0.5 mb-2.5 inline-block rounded-[3px] text-sm leading-[1.7] font-semibold text-muted-foreground hover:text-signal-ink"
            >
              더 보기
              <span className="sr-only"> — {card.title}</span>
            </Link>
          </>
        )}

        {/*
          .reason — 어떤 주제의 리포트인지 한 줄로 알린다. **card.tags 실값만** 쓰고, 첫 태그를
          문구로 세운 뒤 나머지는 `+N` 으로 접는다. 태그가 없으면 이 문구 자체를 만들지 않는다
          (목업의 `트리거 충족` 은 대응 필드가 없어 쓰지 않는다).
          태그 필터 라우트가 없으므로 button·link 로 만들지 않는다 — 눌리지 않는 텍스트다.
          출처는 같은 줄의 작은 메타로 건수만 붙인다(전체 목록은 상세에서 확인).
        */}
        {hasMeta && (
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-[1.45] text-muted-foreground">
            {primaryTag !== undefined && (
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-[5px] w-[5px] shrink-0 rounded-full bg-primary"
                />
                <span className="min-w-0 break-words">
                  관심사 <b className="font-semibold text-ink-mid">‘{primaryTag}’</b>
                  {restTags.length > 0 && ` +${restTags.length}`}
                </span>
              </span>
            )}
            {primaryTag !== undefined && sourceCount > 0 && (
              <span aria-hidden="true" className="text-input">
                ·
              </span>
            )}
            {sourceCount > 0 && <span className="whitespace-nowrap">출처 {sourceCount}건</span>}
          </div>
        )}

        {/* 공유가 우상단으로 빠지면서 액션바는 값이 있을 때만 남는다 — 둘 다 없으면 구분선만
            남은 빈 줄이 생기므로 바 자체를 만들지 않는다. */}
        {(card.scrapped !== null || card.social !== null) && <CardActions card={card} />}
      </div>
    </article>
  );
}

/**
 * .pacts — 이번 범위에서 **실제로 동작하는 것만** 둔다: 보관 토글 + 좋아요 토글.
 * 공유는 카드 우상단으로 옮겼고(`ShareAction`), 댓글 수·⋯ 메뉴는 대응 값이나 동작이 없어 두지 않는다.
 *
 * 두 액션의 노출 조건이 **서로 독립**이다 — 값이 없는 것만 빠지고 나머지는 그대로 남는다:
 * - 보관: `card.scrapped` 가 검증된 boolean 일 때만(어댑터 `toScrapped`). null 이면 담긴 상태를
 *   알 수 없다는 뜻이라 버튼을 두지 않는다 — 항상 `보관` 으로 보이는 버튼은 이미 담아둔 카드를
 *   클릭 한 번에 해제시킨다.
 * - 좋아요: `social` 이 검증됐을 때만(어댑터가 liked·likeCount 를 함께 검증한 값만 넘긴다).
 *
 * 둘 다 없으면 호출부가 이 바를 렌더하지 않는다(빈 구분선 금지).
 *
 * 게스트에게도 두 버튼을 **숨기지 않는다.** 클릭하면 기존 `useRequireAuth` 게이트가 가입 유도
 * 모달로 받아 요청이 나가지 않는다(카드 상세와 같은 패턴) — 할 수 있다는 사실 자체는 로그인 전에도
 * 보여 주는 편이 낫다.
 */
function CardActions({ card }: { card: PublicFeedCardVM }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-0.5 border-t border-border pt-1">
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
    </div>
  );
}

/**
 * 액션바 좋아요 토글 — 카드 상세·프로필 카드(`author-card.tsx`)와 **같은 훅**을 쓰는 목록용 칩.
 * `PublicFeedCard` 가 `AuthorCardItem` 을 직접 가져오지 않는 것과 같은 이유로(파일 docstring
 * 참조) 이 파일 로컬로 둔다 — 동작은 훅에서 공유하고 마크업만 화면별로 최소 중복한다.
 *
 * 아이콘·수치·간격은 기존 읽기 전용 표시를 그대로 유지하고 버튼으로만 바꾼다. 카드 전체가 상세
 * 링크로 감싸여 있지 않으므로(형제 링크 구조 — 파일 상단 docstring) preventDefault·stopPropagation
 * 없이도 클릭이 상세로 새지 않는다.
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
        aria-label={`${liked ? "좋아요 취소" : "좋아요"} — ${title}`}
        className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] disabled:opacity-50 ${
          liked ? "text-signal-ink" : "text-muted-foreground hover:bg-background hover:text-ink-mid"
        }`}
      >
        <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
        <span className={liked ? "font-semibold text-signal-ink" : "text-muted-foreground"}>
          {likeCount}
        </span>
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

/** 아바타 — 이니셜은 실제 이름에서만 파생한다. 이름이 없으면 중립 기호(장식) — 가짜 이니셜 금지. */
function AuthorAvatar({ initial }: { initial: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-input bg-background text-[11px] font-bold text-muted-foreground"
    >
      {initial ?? "◍"}
    </span>
  );
}

/**
 * .pname / .pmeta — 작성자 이름 + 핸들 + 작성 시각.
 *
 * 목업처럼 `표시이름 @핸들` 을 나란히 두되, **서버가 준 값만** 쓴다:
 * - 둘 다 있으면 `displayName` 을 이름으로, `@username` 을 보조 핸들로 둔다.
 * - `displayName` 만 있으면 이름만 — 핸들 자리를 비운다.
 * - `username` 만 있으면 `@username` 을 이름 자리에 한 번만 쓴다(핸들로 중복 표시하지 않는다).
 * - 두 값이 같은 문자열이면 한 번만 쓴다.
 * - 둘 다 없으면 임의 이름을 만들지 않고 식별 불가 상태를 그대로 알린다.
 *
 * `@` 는 표기일 뿐이라 여기서만 붙인다(어댑터·API 원문에는 없다).
 * 이름과 핸들을 한 줄로 묶어 잘라 긴 이름이 카드 폭을 넘기지 않게 한다.
 */
function AuthorText({
  author,
  createdAtLabel,
}: {
  author: PublicFeedAuthorVM;
  createdAtLabel: string;
}) {
  const { displayName, username } = author;
  const primary = displayName ?? (username !== null ? `@${username}` : null);
  // 핸들은 이름과 **다른 정보를 더할 때만** 덧붙인다(같은 값 반복 금지).
  const handle =
    displayName !== null && username !== null && username !== displayName ? `@${username}` : null;

  return (
    <span className="min-w-0">
      {primary !== null ? (
        /* group-hover: 는 링크로 감쌌을 때만 동작한다(비링크 케이스에서는 무해). */
        <span className="block truncate text-sm">
          <span className="font-bold text-foreground group-hover:text-signal-ink">{primary}</span>
          {handle !== null && (
            <span className="ml-1.5 text-[13px] font-normal text-muted-foreground">{handle}</span>
          )}
        </span>
      ) : (
        /* displayName·username 이 모두 없는 작성자(탈퇴·부재). */
        <span className="block truncate text-sm font-bold text-muted-foreground">
          작성자 정보 없음
        </span>
      )}
      {createdAtLabel && (
        <span className="mt-px block truncate text-xs text-muted-foreground">{createdAtLabel}</span>
      )}
    </span>
  );
}
