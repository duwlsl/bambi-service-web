"use client";

import { useRef, useState } from "react";

import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import { ERROR_CODES } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";
import { deleteInterest } from "@/lib/repositories/interests";
import type { MyInterestsState } from "@/hooks/use-my-interests";
import type { InterestDto } from "@/types/interest";
import type { WikiTag } from "@/types/wiki";

/**
 * 접힌 상태에서 보여줄 관심사 개수. 관심사가 늘어도 패널 높이가 따라 늘지 않게 막는다.
 * 나머지는 `전체 N개 보기`로 펼친다.
 */
const MY_PREVIEW = 6;

/**
 * [내 관심사] — 목업 wiki.html .wcard 목록 기준 (2026-08-05 목업 정렬).
 * 원천 = GET /api/interests (source=USER, 온보딩·발견 후보 추가·직접 추가가 모두 이리로 모인다).
 * - 삭제 = DELETE /api/interests/{id} (soft delete). 404 는 이미 없는 것 → 성공 취급(멱등).
 * - 목업의 "고정됨"·"잠시 쉬는 중"·수정하기 모달(rename)은 이번 범위 밖 — 고정/중지 백엔드가 없고
 *   rename 은 후속. 동작하지 않는 컨트롤을 만들지 않는다.
 *
 * <b>레이아웃 = 칩 + 팝오버(2026-08-12).</b> 08-11 에 카드 → 한 줄 행으로 압축했는데, 행마다
 * `삭제` 버튼이 반복돼 관심사가 늘수록 같은 버튼이 세로로 쌓였다. 이름만 담은 칩으로 한 번 더
 * 압축하고, **칩을 누르면 팝오버**에 그 관심사의 근거와 삭제를 모은다. 목록 안에서 펼치지
 * 않으므로(팝오버는 Portal) 패널 높이가 흔들리지 않는다.
 *
 * <b>출처 배지는 두지 않는다.</b> `fetchUserInterests` 가 `source === "USER"` 만 반환해서
 * 이 목록은 전부 USER 다 — AI 추천/직접 설정을 가를 데이터가 애초에 없다. 이름이 일치하는
 * 자동추출 태그로 "AI 일치"를 표기하던 것도 2026-08-11 에 제거됐다(agent confidence 가
 * 전부 52% 로 같아 변별이 0 이었다). 없는 구분을 시각적으로 지어내지 않는다.
 */
export function WikiMyInterests({
  state,
  wikiTags,
  onRemoved,
}: {
  state: MyInterestsState & { refetch: () => void };
  wikiTags: WikiTag[] | null;
  /** 뺀 관심사 이름을 알린다 — 화면이 그 이름을 발견 목록에 남겨 되돌릴 수 있게 한다. */
  onRemoved: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  /** 삭제 결과 낭독 — 칩이 사라지는 조작이라 시각 피드백만으로는 알 수 없다. */
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  const interests = state.status === "success" ? state.data : [];
  const visible = expanded ? interests : interests.slice(0, MY_PREVIEW);

  /** 삭제로 칩이 사라지면 포커스가 body 로 떨어진다 → 목록으로 되돌린다. */
  function recoverFocus() {
    listRef.current?.focus();
  }

  return (
    // 발견 후보 패널과 짝을 이루는 박스(2026-08-11 우석 — 2열 배치). 같은 껍데기·같은 제목 크기라
    // 왼쪽에서 추가하면 오른쪽에 나타나는 이동이 한눈에 읽힌다.
    <section
      aria-label="내 관심사"
      className="rounded-[14px] border border-border bg-card px-[18px] py-4"
    >
      <h2 className="flex items-baseline gap-2 text-[15px] font-bold tracking-[-0.01em] text-foreground">
        내 관심사
        {state.status === "success" && (
          <span className="text-[11.5px] font-normal text-muted-foreground">
            {state.data.length}개
          </span>
        )}
      </h2>
      {/*
        안내는 섹션에 한 번만 둔다(2026-08-11 우석 — 화면 정리). 이전에는 카드마다
        "직접 추가한 관심사예요 — 관련 자료를 저장하면 AI 이해가 깊어져요"가 똑같이 반복돼
        10개면 같은 문장이 10번 나왔다. 칩에는 이름만 남기고 나머지는 팝오버로 접는다.
      */}
      <p className="mt-1 mb-3 text-[12.5px] leading-[1.6] text-muted-foreground">
        브리핑 주제로 쓰는 관심사예요. 눌러서 자세히 보거나 삭제할 수 있고, 삭제하면 발견 목록으로 돌아가요.
      </p>

      {state.status === "loading" && <FeedSkeleton />}

      {state.status === "error" && (
        <StateView
          role="alert"
          className="min-h-[120px]"
          icon={<IconAlert />}
          title="내 관심사를 불러오지 못했어요"
          description="일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요."
          actions={[{ label: "다시 시도", onClick: state.refetch, variant: "primary" }]}
        />
      )}

      {state.status === "success" && state.data.length === 0 && (
        <StateView
          className="min-h-[120px]"
          icon={<IconEmptyDoc />}
          title="아직 관심사가 없어요"
          description="발견 목록에서 추가하거나, 관심 자료를 저장해 AI가 찾게 해보세요."
        />
      )}

      {state.status === "success" && state.data.length > 0 && (
        <>
          <ul ref={listRef} tabIndex={-1} className="flex flex-wrap gap-1.5 outline-none">
            {visible.map((interest) => (
              <li key={interest.id} className="min-w-0 max-w-full">
                <InterestChip
                  interest={interest}
                  matched={findMatchedTag(interest, wikiTags)}
                  onRemoved={onRemoved}
                  announce={setAnnouncement}
                  recoverFocus={recoverFocus}
                />
              </li>
            ))}
          </ul>

          {state.data.length > MY_PREVIEW && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 min-h-9 w-full text-[12.5px] font-semibold text-ink-mid"
            >
              {expanded ? "접기" : `전체 ${state.data.length}개 보기`}
            </Button>
          )}
        </>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

/** 이름(trim·소문자) 일치로 자동추출 태그를 찾는다 — 근거 문구 표시용, 데이터는 섞지 않는다. */
function findMatchedTag(interest: InterestDto, wikiTags: WikiTag[] | null): WikiTag | null {
  if (!wikiTags) return null;
  const name = interest.name.trim().toLowerCase();
  return wikiTags.find((tag) => tag.tag.trim().toLowerCase() === name) ?? null;
}

/**
 * 관심사 칩 1개 — 누르면 팝오버에 상세가 열린다.
 *
 * 팝오버 내용은 **지금 데이터로 실제 채울 수 있는 것만** 둔다:
 * 이름(칩에서 잘린 긴 이름을 여기서 온전히 읽는다) + 근거(이름이 일치하는 자동추출 태그의
 * `reasonMessages`, 있을 때만) + 삭제. 생성 출처 줄은 두지 않는다 — 목록이 전부 USER 라
 * 표시해도 정보가 0 이다.
 *
 * 삭제는 2단계 확인을 거친다. soft delete 라 서버에는 남지만 사용자 입장에선 목록에서
 * 사라지는 조작이고, 되돌리려면 발견 목록에서 다시 추가해야 한다.
 */
function InterestChip({
  interest,
  matched,
  onRemoved,
  announce,
  recoverFocus,
}: {
  interest: InterestDto;
  matched: WikiTag | null;
  onRemoved: (name: string) => void;
  announce: (message: string) => void;
  recoverFocus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  /** 삭제로 닫히는 경우에만 포커스를 목록으로 보낸다(트리거가 사라지므로 radix 기본 복귀가 무의미). */
  const deleted = useRef(false);

  const reasons = matched?.reasonMessages ?? [];

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirming(false);
      setFailed(false);
    }
  }

  function remove() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    deleteInterest(interest.id)
      .then(() => finishRemoved())
      .catch((err) => {
        // 이미 삭제된 경우 목표 상태 달성 — 목록 재조회로 정합시킨다.
        if (err instanceof ApiError && err.code === ERROR_CODES.NOT_FOUND) {
          finishRemoved();
          return;
        }
        setFailed(true);
        setConfirming(false);
      })
      .finally(() => setBusy(false));
  }

  function finishRemoved() {
    deleted.current = true;
    announce(`${interest.name} 관심사를 삭제했어요`);
    setOpen(false);
    onRemoved(interest.name);
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {/*
          칩 전체가 트리거다. hover·focus·열림(aria-expanded) 셋 다 테두리와 글자색이 바뀌어
          "누를 수 있는 것"이 보이게 한다. 긴 이름은 잘리지만 DOM 에는 전문이 남아
          접근성 이름과 팝오버 제목에서 온전히 읽힌다.
          최소 높이 36px — 모바일 터치 영역 확보.
        */}
        <button
          type="button"
          className="focus-ring inline-flex min-h-9 max-w-full min-w-0 cursor-pointer items-center rounded-full border border-border bg-secondary px-3 py-1.5 text-[12.5px] font-semibold text-foreground transition-colors hover:border-primary hover:text-signal-ink aria-expanded:border-primary aria-expanded:text-signal-ink"
        >
          <span className="min-w-0 truncate">{interest.name}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        aria-label={`${interest.name} 관심사 상세`}
        onCloseAutoFocus={(event) => {
          if (!deleted.current) return; // 일반 닫기(Esc·바깥 클릭)는 radix 기본대로 칩으로 복귀
          deleted.current = false;
          event.preventDefault();
          recoverFocus();
        }}
      >
        <p className="text-[13.5px] font-bold wrap-anywhere text-foreground">{interest.name}</p>

        {reasons.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-1">
            {reasons.map((reason) => (
              <li key={reason} className="text-[12px] leading-[1.6] text-ink-mid">
                {reason}
              </li>
            ))}
          </ul>
        )}

        {failed && (
          <p role="alert" className="mt-2 text-[11.5px] text-destructive">
            삭제하지 못했어요. 다시 시도해 주세요.
          </p>
        )}

        {confirming ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-auto text-[12px] text-ink-mid">삭제할까요?</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={remove}
              disabled={busy}
              aria-busy={busy}
              autoFocus
              className="min-h-9"
            >
              {busy ? "삭제 중…" : "삭제"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="min-h-9"
            >
              취소
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirming(true)}
              aria-label={`${interest.name} 관심사 삭제`}
              className="min-h-9 hover:border-destructive hover:text-destructive"
            >
              삭제
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
