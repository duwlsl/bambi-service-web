"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { useRequireAuth } from "@/components/auth/use-require-auth";
import { AddMaterialModal } from "@/components/home/add-material-modal";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { HomeNav } from "@/components/home/home-nav";
import { SideLeft } from "@/components/home/side-left";
import { AuthorCardItem } from "@/components/profile/author-card";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { ProfileRail } from "@/components/profile/profile-rail";
import { ProfileShareButton } from "@/components/profile/profile-share-button";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { IconAlert } from "@/components/ui/state-icons";
import { type AuthorCardsState, useAuthorCards, useProfile } from "@/hooks/use-profile";
import { followUser, unfollowUser } from "@/lib/repositories/profile";
import { MOCK_SIDE_FOOT } from "@/lib/mock/feed";
import type { FollowData, Profile } from "@/types/profile";

const PROFILE_MENU_LABEL = "프로필";

const JOINED_FORMAT = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" });

/**
 * 공개 프로필 — /users/[publicId]. 게스트도 열람 가능(백엔드 permitAll, §15 공개 열람 정책).
 * 본인이면 [프로필 편집], 타인이면 [팔로우/팔로잉](게스트 클릭 시 가입 유도 모달). 공유는 양쪽 다.
 *
 * 레이아웃은 목업 `profile-user.html` 처럼 3열(좌측 메뉴 · 본문 · 우측 rail)이고, 폭·간격·숨김
 * breakpoint 는 홈과 같은 규칙을 쓴다(1100 미만 좌측 숨김 · 1240 미만 rail 숨김).
 *
 * **API 없는 목업 블록은 만들지 않는다**: 「이번 주 공개 N건」(기간 집계 없음·목록은 최대 50건 표본),
 * 「비슷한 관심사의 사용자」(추천·사용자 목록 API 없음), 팔로워/팔로잉 목록 모달(목록 API 없음),
 * hero 관심 주제 tags(타인 관심사 API 없음 — 본인만 가능해 비대칭이라 양쪽 다 제외),
 * 아바타·배너 이미지 업로드(컬럼·업로드 API 없음 — 이니셜 아바타와 토큰 기반 cover 로 대신한다),
 * 카드의 댓글 수·조회수(백엔드 전무).
 *
 * 카드 목록은 여기서 한 번만 조회해 본문과 우측 rail 이 나눠 쓴다(rail 때문에 API 를 다시 부르지 않는다).
 */
export function ProfileScreen({ publicId }: { publicId: string }) {
  const { status, user } = useAuth();
  const profile = useProfile(publicId);
  const cards = useAuthorCards(publicId);
  const [amOpen, setAmOpen] = useState(false);

  const isSelf = status === "authenticated" && user?.publicId === publicId;
  const guest = status !== "authenticated" && status !== "loading";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <HomeNav onAddOpen={() => setAmOpen(true)} />

      <div className="mx-auto w-full max-w-[1440px] flex-1">
        <div className="flex items-start justify-center gap-[22px] px-5 pt-6 pb-14">
          <SideLeft
            current={isSelf ? PROFILE_MENU_LABEL : undefined}
            footLines={MOCK_SIDE_FOOT}
            guest={guest}
          />

          <main className="min-w-0 max-w-[760px] flex-1">
            {profile.status === "loading" && <FeedSkeleton />}
            {profile.status === "error" && (
              <PageState
                role="alert"
                icon={<IconAlert />}
                title="프로필을 찾을 수 없어요"
                description="주소가 잘못됐거나, 탈퇴했거나, 잠시 연결이 불안정할 수 있어요."
                actions={[{ label: "다시 시도", onClick: profile.refetch, variant: "primary" }]}
              />
            )}
            {profile.status === "success" && (
              <ProfileBody
                publicId={publicId}
                profile={profile.data}
                cards={cards}
                isSelf={isSelf}
                onEdited={profile.refetch}
              />
            )}
          </main>

          {/* rail 은 프로필 값(전체 공개 수)이 있어야 의미가 있다 — 로딩·오류 때는 3열을 만들지 않는다. */}
          {profile.status === "success" && <ProfileRail profile={profile.data} cards={cards} />}
        </div>
      </div>

      <AddMaterialModal open={amOpen} onClose={() => setAmOpen(false)} />
    </div>
  );
}

function ProfileBody({
  publicId,
  profile,
  cards,
  isSelf,
  onEdited,
}: {
  publicId: string;
  profile: Profile;
  cards: AuthorCardsState & { refetch: () => void };
  isSelf: boolean;
  onEdited: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  /**
   * 팔로우 상태를 hero 에서 한 번만 들고, 버튼·스탯·목록 끝 문구가 같은 값을 본다.
   * 버튼 안에 가둬 두면 팔로우 직후에도 스탯의 팔로워 수와 "팔로우하면 …" 문구가 옛 값으로 남는다.
   * 초기값은 서버 응답이고, 이후에는 follow/unfollow 응답의 **확정값**만 들어온다.
   */
  const [follow, setFollow] = useState<FollowData>({
    following: profile.following,
    followerCount: profile.followerCount,
  });

  const name = profile.displayName?.trim() || "사용자";
  const joined = formatJoined(profile.joinedAt);

  return (
    <>
      {/* 프로필 헤더 — 목업 .pcard(cover + 본문) */}
      <section className="mb-5 overflow-hidden rounded-[14px] border border-border bg-card">
        {/*
          .pcover — **이미지가 아니라 토큰 그라디언트**다. 목업의 cover 도 빈 블록이고, 배너 업로드는
          컬럼·API 가 없다. 사용자별로 색을 만들어내지도 않는다(같은 사람이 다시 봤을 때 달라지거나,
          없는 개인화가 있는 것처럼 보인다). 밝기는 --wash 계열이라 light/dark 모두 토큰을 따라간다.
        */}
        <div
          aria-hidden="true"
          className="h-[104px] border-b border-border bg-[linear-gradient(115deg,var(--wash-strong)_0%,var(--wash)_46%,var(--muted)_100%)]"
        />

        <div className="px-[22px] pb-5">
          <div className="-mt-[34px] mb-3.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-2.5">
            {/* 이니셜 아바타(사진 업로드는 P2) — cover 위로 겹쳐 올린다. */}
            <span
              aria-hidden="true"
              className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-4 border-card bg-wash text-[28px] font-bold text-signal-ink"
            >
              {name.slice(0, 1)}
            </span>

            <div className="flex flex-wrap items-center justify-end gap-2 pb-1">
              <ProfileShareButton publicId={publicId} name={name} />
              {isSelf ? (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  프로필 편집
                </Button>
              ) : (
                <FollowButton publicId={publicId} state={follow} onChange={setFollow} />
              )}
            </div>
          </div>

          <h1 className="text-[20px] leading-[1.35] font-bold tracking-[-0.015em] break-words text-foreground">
            {name}
          </h1>
          {(profile.username !== null || joined !== "") && (
            <div className="mt-0.5 text-[13px] break-words text-muted-foreground">
              {profile.username !== null ? `@${profile.username}` : null}
              {profile.username !== null && joined !== "" ? " · " : null}
              {joined !== "" ? `가입 ${joined}` : null}
            </div>
          )}
          {profile.bio !== null && profile.bio.trim() !== "" && (
            <p className="mt-2.5 text-[13.5px] leading-[1.65] break-words text-ink-mid">
              {profile.bio}
            </p>
          )}

          <ProfileStats profile={profile} followerCount={follow.followerCount} />
        </div>
      </section>

      {/* 공개 브리핑 리스트 — 목업 .post 목록 */}
      {cards.status === "loading" && <FeedSkeleton />}
      {cards.status === "error" && (
        <div
          role="alert"
          className="rounded-[14px] border border-border bg-card px-5 py-6 text-center text-[13.5px] text-ink-mid"
        >
          공개 브리핑을 불러오지 못했어요.{" "}
          <button
            type="button"
            onClick={cards.refetch}
            className="focus-ring rounded-[3px] font-semibold text-signal-ink"
          >
            다시 시도
          </button>
        </div>
      )}
      {cards.status === "empty" && (
        <div className="rounded-[14px] border border-border bg-card px-5 py-8 text-center">
          <div className="mb-1 text-[13.5px] font-bold text-ink-mid">
            아직 공개한 브리핑이 없어요
          </div>
          <div className="text-[12.5px] leading-[1.6] text-muted-foreground">
            {isSelf
              ? "내 보고서에서 카드를 공개로 전환하면 여기에 쌓여요."
              : "이 사용자가 브리핑을 공개하면 여기에 표시돼요."}
          </div>
        </div>
      )}
      {cards.status === "success" && (
        <>
          {cards.data.map((card) => (
            <AuthorCardItem key={card.publicId} card={card} />
          ))}
          <FeedEnd
            name={name}
            total={profile.publicCardCount}
            shown={cards.data.length}
            showFollowHint={!isSelf && !follow.following}
          />
        </>
      )}

      {isSelf && editOpen && (
        <ProfileEditModal profile={profile} onClose={() => setEditOpen(false)} onSaved={onEdited} />
      )}
    </>
  );
}

/**
 * 목록 끝 — 목업 `.feed-end`("FX Daily님의 공개 브리핑 18건 중 6건").
 *
 * 두 숫자 모두 실데이터다: 전체는 프로필의 `publicCardCount`(서버 count(*)), 표시 건수는 지금 화면에
 * 그린 카드 수다. 목록 API 는 기본 20건까지만 주므로 둘이 다른 것이 정상이고, 다 보여준 경우
 * (`shown >= total`)에는 "N건 중 N건" 대신 한 숫자만 말한다.
 *
 * 팔로우 안내는 **팔로우로 실제 달라지는 것**만 말한다(팔로잉 피드가 있다 — GET /api/feed/public
 * ?following=true). 본인이거나 이미 팔로우 중이면 띄우지 않는다.
 */
function FeedEnd({
  name,
  total,
  shown,
  showFollowHint,
}: {
  name: string;
  total: number;
  shown: number;
  showFollowHint: boolean;
}) {
  return (
    <div className="px-5 pt-2 pb-4 text-center">
      <p className="text-[13px] font-bold text-ink-mid">
        {shown >= total
          ? `${name}님의 공개 브리핑 ${shown}건`
          : `${name}님의 공개 브리핑 ${total}건 중 ${shown}건`}
      </p>
      {showFollowHint && (
        <p className="mt-1 text-[12.5px] leading-[1.6] text-muted-foreground">
          팔로우하면 새 공개 브리핑이 내 피드에 표시돼요.
        </p>
      )}
    </div>
  );
}

/**
 * 스탯 줄 — 브리핑(공개)·팔로워·팔로잉. 목업의 "보관"은 스크랩 카운트 API 가 없어 넣지 않는다.
 *
 * 목업은 팔로워·팔로잉을 눌러 목록 모달을 열지만 **목록 조회 API 가 없다**(FollowController 는
 * follow·unfollow·profile 셋뿐). 그래서 누를 수 있는 것처럼 보이지 않게 button·link·커서·hover 를
 * 두지 않고 수치만 표시한다 — 목록 API 가 생기면 그때 연다.
 *
 * 팔로워 수는 팔로우 토글의 **서버 확정값**을 그대로 반영한다(프론트에서 ±1 을 계산하지 않는다).
 */
function ProfileStats({ profile, followerCount }: { profile: Profile; followerCount: number }) {
  const items: { label: string; value: number }[] = [
    { label: "브리핑", value: profile.publicCardCount },
    { label: "팔로워", value: followerCount },
    { label: "팔로잉", value: profile.followingCount },
  ];
  return (
    <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="text-[13px] text-muted-foreground">
          <strong className="mr-1 text-[14.5px] font-bold text-foreground">{it.value}</strong>
          {it.label}
        </span>
      ))}
    </div>
  );
}

/**
 * 팔로우/팔로잉 토글 — 게스트 클릭은 가입 유도 모달(requireAuth).
 * 응답(FollowData)이 확정값이므로 성공 시 그대로 상위 상태에 반영한다(낙관적 갱신 아님 —
 * 이중클릭에도 안전). 팔로워 수는 스탯 줄이 보여주므로 버튼 아래에 다시 적지 않는다.
 */
function FollowButton({
  publicId,
  state,
  onChange,
}: {
  publicId: string;
  state: FollowData;
  onChange: (next: FollowData) => void;
}) {
  const { requireAuth } = useRequireAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  function toggle() {
    requireAuth(() => {
      if (busy) return;
      setBusy(true);
      setFailed(false);
      const call = state.following ? unfollowUser(publicId) : followUser(publicId);
      call
        .then((data) => onChange(data))
        .catch(() => setFailed(true))
        .finally(() => setBusy(false));
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={state.following ? "outline" : "default"} onClick={toggle} disabled={busy}>
        {state.following ? "팔로잉" : "팔로우"}
      </Button>
      <span
        role="status"
        aria-live="polite"
        className={`text-[11.5px] ${failed ? "text-ink-mid" : "sr-only"}`}
      >
        {failed ? "잠시 후 다시 시도해 주세요" : ""}
      </span>
    </div>
  );
}

function formatJoined(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  return JOINED_FORMAT.format(new Date(ts));
}
