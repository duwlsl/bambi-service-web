"use client";

import Link from "next/link";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/components/auth/use-auth";
import { useRequireAuth } from "@/components/auth/use-require-auth";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useFollowToggle } from "@/hooks/use-follow-toggle";
import { type FollowListState, useProfileFollowList } from "@/hooks/use-profile-follow-list";
import type { FollowListKind, FollowUserVM } from "@/types/profile";

const TABS: { kind: FollowListKind; label: string }[] = [
  { kind: "followers", label: "팔로워" },
  { kind: "following", label: "팔로잉" },
];

const EMPTY_COPY: Record<FollowListKind, string> = {
  followers: "아직 팔로워가 없어요.",
  following: "아직 팔로우한 사용자가 없어요.",
};

/**
 * 팔로워/팔로잉 목록 모달 — 목업 `profile-user.html` 의 `#ff-modal`.
 *
 * 목업 구조를 그대로 따른다: 헤더(프로필 이름 + ✕) · 탭 2개(라벨에 수치 포함) ·
 * `max-height:320px` 스크롤 목록 · 행 = 아바타 + 이름/핸들 + 팔로우 버튼.
 * 표면·간격·포커스 규약은 앱의 기존 모달(`profile-edit-modal`)을 따른다 — 목업 hex 하드코딩 없음.
 *
 * **목업과 다른 한 곳**: 행의 보조 줄이 목업은 `@handle · 주제` 인데 여기는 `@handle` 만이다.
 * 목록 API(`FollowUserResponse`)가 `publicId·username·displayName·following` 넷만 주고 bio·관심
 * 주제를 주지 않는다 → 없는 문구를 지어내지 않는다.
 *
 * **탭 수치는 이미 받아 둔 프로필 응답**(`followerCount`/`followingCount`)을 쓴다. 목록을 열었다고
 * 프로필 API 를 다시 부르지 않는다.
 *
 * **한 번 연 탭은 계속 enabled** 로 둬서(`opened`) 탭을 오갈 때 같은 API 를 다시 부르지 않고,
 * 열지 않은 탭은 아예 요청하지 않는다.
 *
 * 게스트도 목록을 볼 수 있다(백엔드 GET permitAll). 다만 게스트 응답의 `following` 은 전부 false 라
 * 모든 행이 `팔로우` 로 보이고, 누르면 가입 유도 모달이 가로채 요청이 나가지 않는다.
 */
export function FollowListModal({
  ownerPublicId,
  ownerName,
  initialTab,
  followerCount,
  followingCount,
  onClose,
  onSelfFollowChanged,
}: {
  /** 프로필 주인 — 목록 조회 대상. */
  ownerPublicId: string;
  /** 모달 제목(목업은 프로필 이름을 제목에 둔다). */
  ownerName: string;
  initialTab: FollowListKind;
  followerCount: number;
  followingCount: number;
  onClose: () => void;
  /**
   * **내 프로필에서** 목록의 누군가를 팔로우/언팔했고, 그래서 내 `followingCount` 가 실제로 바뀐
   * 경우에만 **모달을 닫을 때 한 번** 호출된다(프로필 재조회용 — 서버 확정값으로 hero 를 맞춘다).
   *
   * 토글 직후가 아니라 닫을 때인 이유: 프로필 재조회는 화면을 loading 으로 되돌려 프로필 본문을
   * 잠시 언마운트시키고, 그러면 **열려 있던 이 모달까지 사라진다**(실측). 목록을 계속 만지는
   * 도중에 모달이 닫히는 편보다, 닫은 뒤 수치가 맞춰지는 편이 낫다.
   *
   * 남의 프로필에서는 호출하지 않는다 — 내가 제3자를 팔로우해도 그 프로필의 수치는 그대로다.
   */
  onSelfFollowChanged?: () => void;
}) {
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<FollowListKind>(initialTab);
  /** 한 번이라도 연 탭 — enabled 를 껐다 켜지 않으려고 누적만 한다(재조회 방지). */
  const [opened, setOpened] = useState<FollowListKind[]>([initialTab]);
  /**
   * 행별 팔로우 상태의 로컬 확정값(서버 응답으로만 채운다). 목록을 통째로 다시 부르지 않고
   * 누른 행만 갱신하기 위한 덮어쓰기 맵이다. 두 탭이 공유하므로 같은 사람이 양쪽에 있어도 일관된다.
   */
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  /** 이 모달에서 팔로우 상태를 실제로 바꿨는지 — 닫을 때 프로필을 다시 받을지 판단한다. */
  const changed = useRef(false);

  useFocusTrap(true, dialogRef);

  /** 닫기 경로는 전부 여기로 모은다(✕·Escape·backdrop·행 이동) — 재조회 조건이 한 곳에만 있게. */
  const close = useCallback(() => {
    if (changed.current) onSelfFollowChanged?.();
    onClose();
  }, [onClose, onSelfFollowChanged]);

  // Escape 로 닫기 — 기존 모달(profile-edit-modal)과 같은 규약.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const followers = useProfileFollowList(ownerPublicId, "followers", opened.includes("followers"));
  const following = useProfileFollowList(ownerPublicId, "following", opened.includes("following"));
  const state: Record<FollowListKind, FollowListState & { refetch: () => void }> = {
    followers,
    following,
  };

  const selectTab = useCallback((next: FollowListKind) => {
    setTab(next);
    setOpened((prev) => (prev.includes(next) ? prev : [...prev, next]));
  }, []);

  const onRowFollowChanged = useCallback((targetPublicId: string, nextFollowing: boolean) => {
    setFollowed((prev) => ({ ...prev, [targetPublicId]: nextFollowing }));
    changed.current = true;
  }, []);

  // 탭 목록의 표준 키보드 이동(← → Home End). 선택 즉시 해당 패널이 보인다.
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((t) => t.kind === tab);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    const kind = TABS[next].kind;
    selectTab(kind);
    dialogRef.current?.querySelector<HTMLButtonElement>(`#ff-tab-${kind}`)?.focus();
  }

  const counts: Record<FollowListKind, number> = {
    followers: followerCount,
    following: followingCount,
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-[rgba(12,14,17,.45)]"
      onClick={close}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${ownerName} 팔로워·팔로잉`}
          onClick={(e) => e.stopPropagation()}
          className="w-[440px] max-w-full rounded-2xl border border-border bg-card px-6 py-[22px] shadow-[0_24px_60px_rgba(10,12,15,.28)]"
        >
          {/* .mhead */}
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[16.5px] font-bold text-foreground">
              {ownerName}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              data-autofocus
              className="focus-ring shrink-0 rounded-[7px] px-[7px] py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {/* .tabs — 라벨에 수치를 함께 둔다(목업 `팔로워 1,284`). */}
          <div
            role="tablist"
            aria-label="팔로워·팔로잉"
            className="mb-2 flex overflow-hidden rounded-[14px] border border-border"
          >
            {TABS.map((t) => {
              const on = t.kind === tab;
              return (
                <button
                  key={t.kind}
                  id={`ff-tab-${t.kind}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={`ff-panel-${t.kind}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => selectTab(t.kind)}
                  onKeyDown={onTabKeyDown}
                  className={`focus-ring relative flex-1 py-3 text-center text-[14.5px] font-semibold ${
                    on ? "text-foreground" : "text-muted-foreground hover:text-ink-mid"
                  }`}
                >
                  {t.label} {counts[t.kind]}
                  {/* .tab.on .tl::after — 4px signal 밑줄. 상태를 색으로만 전달하지 않는다. */}
                  {on && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {TABS.map((t) => (
            <div
              key={t.kind}
              id={`ff-panel-${t.kind}`}
              role="tabpanel"
              aria-labelledby={`ff-tab-${t.kind}`}
              hidden={t.kind !== tab}
              className="max-h-[320px] overflow-y-auto overscroll-contain"
            >
              {t.kind === tab && (
                <TabPane
                  kind={t.kind}
                  state={state[t.kind]}
                  viewerPublicId={user?.publicId ?? null}
                  followed={followed}
                  onFollowChanged={onRowFollowChanged}
                  onNavigate={close}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 탭 하나의 본문 — idle/loading/empty/error/success. 모달 껍데기는 그대로 두고 이 안만 바뀐다. */
function TabPane({
  kind,
  state,
  viewerPublicId,
  followed,
  onFollowChanged,
  onNavigate,
}: {
  kind: FollowListKind;
  state: FollowListState & { refetch: () => void };
  viewerPublicId: string | null;
  followed: Record<string, boolean>;
  onFollowChanged: (publicId: string, following: boolean) => void;
  onNavigate: () => void;
}) {
  if (state.status === "idle" || state.status === "loading") return <ListSkeleton />;

  if (state.status === "error") {
    return (
      <div role="alert" className="px-1 py-6 text-center">
        <p className="text-[13px] text-ink-mid">목록을 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={state.refetch}
          className="focus-ring mt-2 rounded-[3px] text-[13px] font-semibold text-signal-ink"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <p className="px-1 py-8 text-center text-[13px] text-muted-foreground">{EMPTY_COPY[kind]}</p>
    );
  }

  return (
    <ul>
      {state.data.map((row) => (
        <UserRow
          key={row.publicId}
          row={row}
          isMe={viewerPublicId !== null && viewerPublicId === row.publicId}
          following={followed[row.publicId] ?? row.following}
          onFollowChanged={onFollowChanged}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}

/**
 * .urow — 아바타 + 이름/핸들 + 팔로우 버튼.
 *
 * 링크와 버튼을 **형제로** 둔다(`<a><button>` 중첩 금지). 팔로우 클릭이 프로필 이동을 유발하지
 * 않고, 이름 영역 클릭만 `/users/{publicId}` 로 간다(이동하면서 모달을 닫는다).
 *
 * 이름이 하나도 없으면(서버가 둘 다 null) 이름 줄을 만들지 않는다 — "익명"·"사용자1" 같은 이름을
 * 지어내지 않는다. 대신 링크에 aria-label 을 줘서 이름 없는 링크가 되지 않게 한다.
 */
function UserRow({
  row,
  isMe,
  following,
  onFollowChanged,
  onNavigate,
}: {
  row: FollowUserVM;
  isMe: boolean;
  following: boolean | null;
  onFollowChanged: (publicId: string, following: boolean) => void;
  onNavigate: () => void;
}) {
  const name = row.displayName ?? row.username;

  return (
    <li className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0">
      <Link
        href={`/users/${row.publicId}`}
        onClick={onNavigate}
        aria-label={name ?? "사용자 프로필"}
        className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px]"
      >
        <span
          aria-hidden="true"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-input bg-background text-[11px] font-bold text-muted-foreground"
        >
          {row.initial ?? "◍"}
        </span>
        <span className="min-w-0 flex-1">
          {name !== null && (
            <span className="block truncate text-[13px] font-bold text-foreground">{name}</span>
          )}
          {row.username !== null && (
            <span className="mt-px block truncate text-[11.5px] text-muted-foreground">
              @{row.username}
            </span>
          )}
        </span>
      </Link>

      {/* 본인 행에는 팔로우 버튼을 두지 않는다(자기 자신은 팔로우할 수 없다 — 서버도 400 으로 막는다).
          following 이 null(값 미상)인 행도 마찬가지로 버튼을 만들지 않는다. */}
      {!isMe && following !== null && (
        <RowFollowButton
          publicId={row.publicId}
          name={name}
          following={following}
          onChanged={onFollowChanged}
        />
      )}
    </li>
  );
}

/** 행 팔로우 토글 — hero 버튼과 **같은 훅**(useFollowToggle). 행마다 busy·실패 상태가 독립이다. */
function RowFollowButton({
  publicId,
  name,
  following,
  onChanged,
}: {
  publicId: string;
  name: string | null;
  following: boolean;
  onChanged: (publicId: string, following: boolean) => void;
}) {
  const { requireAuth } = useRequireAuth();
  const onChange = useCallback(
    (data: { following: boolean }) => onChanged(publicId, data.following),
    [onChanged, publicId],
  );
  const { busy, failed, toggle } = useFollowToggle({ publicId, following, onChange });

  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5">
      <Button
        variant={following ? "outline" : "default"}
        className="h-7 px-2.5 text-[12px]"
        onClick={() => requireAuth(toggle)}
        disabled={busy}
        aria-busy={busy}
      >
        {following ? "팔로잉" : "팔로우"}
        {name !== null && <span className="sr-only"> — {name}</span>}
      </Button>
      {/* 목록이라 어느 행이 실패했는지 알 수 있게 그 행에서 알린다. 서버 문구 원문은 쓰지 않는다. */}
      <span
        role="status"
        aria-live="polite"
        className={`text-[11px] whitespace-nowrap ${failed ? "text-ink-mid" : "sr-only"}`}
      >
        {failed ? "다시 시도해 주세요" : ""}
      </span>
    </span>
  );
}

/** 로딩 — 모달 껍데기는 유지하고 목록 자리만 중립 placeholder 로 채운다(실제 이름 선노출 금지). */
function ListSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 py-2.5">
          <div className="h-[34px] w-[34px] shrink-0 rounded-full bg-[var(--skel1)]" />
          <div className="flex-1">
            <div className="mb-1.5 h-3 w-24 rounded-md bg-[var(--skel1)]" />
            <div className="h-2.5 w-16 rounded-md bg-[var(--skel1)]" />
          </div>
          <div className="h-7 w-[62px] rounded-lg bg-[var(--skel1)]" />
        </div>
      ))}
    </div>
  );
}
