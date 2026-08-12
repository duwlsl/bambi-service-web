"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ERROR_CODES } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";
import { createInterest } from "@/lib/repositories/interests";
import { blockWikiTag } from "@/lib/repositories/wiki";
import type { WikiInterestsState } from "@/hooks/use-wiki-interests";
import type { InterestDto } from "@/types/interest";

/**
 * 후보 표시 상한 — 강도순. 목업은 2건만 뒀지만 실사용에서 후보가 너무 적게 보여
 * "AI가 파악한 범위가 좁다"는 인상을 줬다(2026-08-05 우석 지적).
 * 2026-08-11 에 12 → 20 (agent 추출 상한과 동일). 12 에서 잘리면 agent 가 찾은 걸
 * 화면이 감추는 셈이라 상한을 원천과 맞췄다.
 */
const FOUND_LIMIT = 20;

/**
 * 접힌 상태에서 보여줄 추천 개수. 상한(20)을 그대로 펼치면 추천이 화면을 먹고
 * [내 관심사]가 밀려나므로, 기본은 2건만 두고 나머지는 사용자가 펼쳐서 본다.
 * 목업 wiki.html .found 의 2건과도 같은 수다.
 */
const FOUND_PREVIEW = 2;

/**
 * [AI가 최근 발견한 관심사] — 목업 wiki.html .found 기준 (2026-08-05 목업 정렬).
 * 후보 = 자동추출 태그(GET /api/wiki/tags) 중 [내 관심사](source=USER)에 아직 없는 것.
 * - "추가" = POST /api/interests {name} → 성공 시 내 관심사 목록 refetch(후보가 옆 섹션으로 이동).
 *   409(이미 등록)는 목표 상태 달성으로 간주해 성공 처리한다(온보딩 replace 규칙과 동일).
 * - "숨기기" = POST /api/wiki/tags/blocks → 이 목록에서만 빼는 **추천 제외**다. 자료·관심사를
 *   지우지 않는다. 다만 해제(unblock) API 가 없어 화면에서 되돌릴 수 없으므로 확인 단계를 둔다.
 * - 목업의 "무시" 버튼은 만들지 않는다 — blocks 로 대체됐다. 후보가 0건이면 안내만 남긴다.
 *
 * <b>레이아웃 = 압축 행(2026-08-12 검수 반영).</b> 한 번 소형 카드(이름 / 근거 한 줄 / 버튼 2개)로
 * 펼쳐 봤는데, 흰 패널 위에 회색 카드가 항목마다 겹쳐 보이면서 화면이 무거워지고 세로로도 길어졌다.
 * 항목 배경·내부 여백·근거 줄을 걷어내고 <b>이름 | ＋ 추가 | 숨기기</b> 를 한 줄에 놓는다.
 * 구분은 별도 카드가 아니라 얇은 구분선(divide-y)이 맡는다.
 * - 근거 문구는 행에 두지 않는다. 항목마다 같은 상용구가 반복돼 정보가 아니라 소음이었고,
 *   섹션 안내 한 줄이 같은 말을 이미 하고 있다. (관심사별 근거는 [내 관심사] 칩 팝오버에 남아 있다.)
 * - 이름이 남은 폭을 쓰고 길면 말줄임, 버튼 둘은 shrink 하지 않는다 → 320px 에서도 한 줄이 유지된다.
 */
export function WikiFound({
  tags,
  myInterests,
  removedNames,
  onAdded,
  onHidden,
}: {
  tags: WikiInterestsState & { refetch: () => void };
  myInterests: InterestDto[] | null;
  /** 이번 화면에서 내 관심사에서 뺀 이름 — 서버 태그가 사라져도 되돌릴 수 있게 후보로 남긴다. */
  removedNames: readonly string[];
  onAdded: (name: string) => void;
  /** 숨긴 이름 — 서버에 저장되므로 화면은 목록만 다시 읽으면 된다. */
  onHidden: (name: string) => void;
}) {
  if (tags.status !== "success" || myInterests === null) return null;

  const owned = new Set(myInterests.map((interest) => normalizeName(interest.name)));
  const fromTags = tags.data.filter((tag) => !owned.has(normalizeName(tag.tag)));
  // 방금 뺀 이름 중 (a) 아직 내 관심사에 없고 (b) 서버 태그에도 안 남은 것만 덧붙인다.
  // 서버가 태그를 갖고 있으면 fromTags 에 이미 있으므로 중복되지 않는다.
  const tagNames = new Set(fromTags.map((tag) => normalizeName(tag.tag)));
  const restorable = removedNames.filter(
    (name) => !owned.has(normalizeName(name)) && !tagNames.has(normalizeName(name)),
  );
  const candidates = [
    ...fromTags.map((tag) => ({ key: tag.tagId, name: tag.tag })),
    ...restorable.map((name) => ({ key: `removed:${name}`, name })),
  ].slice(0, FOUND_LIMIT);

  // 후보 0건이어도 섹션을 통째로 지우지 않는다(2026-08-11 우석 — "발견 섹션이 어디 갔냐").
  // 전부 추가해서 비었을 뿐인데 흔적 없이 사라지면 고장으로 읽힌다. 단 AI 가 아직 아무것도
  // 못 찾은 상태(tags 0건)에서는 빈 안내조차 의미가 없으므로 그때만 렌더하지 않는다.
  if (candidates.length === 0) {
    if (tags.data.length === 0) return null;
    return (
      <FoundSection>
        <p className="mt-1 text-[12.5px] leading-[1.6] text-muted-foreground">
          AI가 찾은 주제를 모두 내 관심사에 추가했어요. 자료를 더 저장하면 새 주제를 찾아 여기에 보여드릴게요.
        </p>
      </FoundSection>
    );
  }

  return <FoundPanel candidates={candidates} onAdded={onAdded} onHidden={onHidden} />;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

type Candidate = { key: string; name: string };

/**
 * 섹션 껍데기 — 온디맨드 패널(.on-demand-panel)과 같은 rounded-[14px] border bg-card 컨테이너
 * (2026-08-11 우석). 항목이 배경 없이 떠 있어도 어디까지가 이 섹션인지 경계가 보이게 한다.
 * 건수는 보조 정보라 굵기를 낮춰 제목과 경쟁하지 않게 둔다.
 */
function FoundSection({ count, children }: { count?: number; children: ReactNode }) {
  return (
    <section
      aria-label="AI가 최근 발견한 관심사"
      className="rounded-[14px] border border-border bg-card px-[18px] py-4"
    >
      <h2 className="flex items-baseline gap-2 text-[15px] font-bold tracking-[-0.01em] text-foreground">
        AI가 최근 발견한 관심사
        {count !== undefined && (
          <span className="text-[11.5px] font-normal text-muted-foreground">{count}건</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function FoundPanel({
  candidates,
  onAdded,
  onHidden,
}: {
  candidates: Candidate[];
  onAdded: (name: string) => void;
  onHidden: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  /** 처리 결과 낭독 — 행이 사라지는 조작이라 시각 피드백만으로는 알 수 없다. */
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  const visible = expanded ? candidates : candidates.slice(0, FOUND_PREVIEW);
  const restCount = candidates.length - FOUND_PREVIEW;

  /** 추가·숨기기로 행이 사라지면 포커스가 body 로 떨어진다 → 목록으로 되돌린다. */
  function recoverFocus() {
    listRef.current?.focus();
  }

  return (
    <FoundSection count={candidates.length}>
      <p className="mt-1 mb-2 text-[12.5px] leading-[1.6] text-muted-foreground">
        저장한 자료에서 AI가 찾은 주제예요. 추가하면 브리핑 주제로 쓰고, 숨기면 이 목록에서 빼요.
      </p>

      <ul ref={listRef} tabIndex={-1} className="divide-y divide-border outline-none">
        {visible.map((candidate) => (
          <FoundRow
            key={candidate.key}
            name={candidate.name}
            onAdded={onAdded}
            onHidden={onHidden}
            announce={setAnnouncement}
            recoverFocus={recoverFocus}
          />
        ))}
      </ul>

      {restCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 min-h-9 w-full text-[12.5px] font-semibold text-ink-mid"
        >
          {expanded ? "접기" : `추천 ${restCount}개 더 보기`}
        </Button>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </FoundSection>
  );
}

/**
 * 후보 1행 — 이름 | ＋ 추가 | 숨기기 를 한 줄에 둔다.
 * 이름만 `min-w-0 flex-1 truncate` 로 남은 폭을 쓰고 버튼 둘은 `shrink-0` 이라, 폭이 줄어도
 * 버튼이 찌그러지거나 다음 줄로 넘어가지 않는다.
 *
 * 숨기기는 서버(V27)에 저장되고 해제 API 가 없어 화면에서 되돌릴 수 없다 → 2단계 확인을 둔다.
 * 확인 단계도 같은 한 줄을 쓴다(질문 | 숨기기 | 취소). 추가는 [내 관심사]에서 다시 삭제하면
 * 이 목록으로 돌아오므로 확인 없이 즉시 실행한다.
 *
 * 처리 중에는 버튼 문구를 바꾸지 않는다 — 폭이 변하면 좁은 화면에서 한 줄이 깨진다.
 * 대신 행을 흐리게 하고 `disabled` + `aria-busy` 로 알리며, 결과는 섹션의 live region 이 낭독한다.
 */
function FoundRow({
  name,
  onAdded,
  onHidden,
  announce,
  recoverFocus,
}: {
  name: string;
  onAdded: (name: string) => void;
  onHidden: (name: string) => void;
  announce: (message: string) => void;
  recoverFocus: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);
  const wasConfirming = useRef(false);

  /*
    확인 단계를 열면 확인 버튼으로, 취소하면 원래 `숨기기` 버튼으로 포커스를 옮긴다.
    ref 를 배열로 모으는 대신 행 안에서 data 속성으로 찾는다(post-more-menu 와 같은 방식 —
    렌더 중 ref 접근을 피한다). 첫 렌더(confirming=false)에서는 포커스를 건드리지 않는다.
  */
  useEffect(() => {
    const root = rowRef.current;
    if (!root) return;
    if (confirming) {
      root.querySelector<HTMLButtonElement>('[data-confirm="hide"]')?.focus();
    } else if (wasConfirming.current) {
      root.querySelector<HTMLButtonElement>('[data-action="hide"]')?.focus();
    }
    wasConfirming.current = confirming;
  }, [confirming]);

  function add() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    createInterest(name.trim())
      .then(() => {
        announce(`${name}을(를) 내 관심사에 추가했어요`);
        onAdded(name);
        recoverFocus();
      })
      .catch((err) => {
        // 이미 등록돼 있으면 목표 상태 달성 — 성공과 동일하게 목록을 다시 읽어 정합시킨다.
        if (err instanceof ApiError && err.code === ERROR_CODES.DUPLICATE_RESOURCE) {
          announce(`${name}은(는) 이미 내 관심사에 있어요`);
          onAdded(name);
          recoverFocus();
          return;
        }
        setFailed(true);
      })
      .finally(() => setBusy(false));
  }

  function hide() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    blockWikiTag(name)
      .then(() => {
        announce(`${name}을(를) 추천에서 숨겼어요`);
        onHidden(name);
        recoverFocus();
      })
      .catch(() => {
        setFailed(true);
        setConfirming(false);
      })
      .finally(() => setBusy(false));
  }

  return (
    <li
      ref={rowRef}
      onKeyDown={(event) => {
        // 확인 단계에서 Esc = 취소. 팝오버가 아니라 행 안 인라인 확인이라 직접 받는다.
        if (event.key !== "Escape" || !confirming) return;
        event.stopPropagation();
        setConfirming(false);
      }}
      className={`py-1 first:pt-0 last:pb-0 ${busy ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {confirming ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-mid">숨길까요?</span>
            <Button
              type="button"
              data-confirm="hide"
              variant="destructive"
              size="xs"
              onClick={hide}
              disabled={busy}
              aria-busy={busy}
              aria-label={`${name} 추천에서 숨기기 확인`}
              className="min-h-8 shrink-0"
            >
              숨기기
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setConfirming(false)}
              disabled={busy}
              aria-label={`${name} 숨기기 취소`}
              className="min-h-8 shrink-0"
            >
              취소
            </Button>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
              {name}
            </span>
            {/*
              순서 = 숨기기 → 추가 (2026-08-12 검수). 주 동작인 `추가` 를 줄 끝(오른쪽 가장자리)에
              둬서 시선과 커서가 가장 먼저 닿는 자리를 차지하게 한다.
            */}
            <Button
              type="button"
              data-action="hide"
              variant="ghost"
              size="xs"
              onClick={() => setConfirming(true)}
              disabled={busy}
              aria-label={`${name} 추천에서 숨기기`}
              className="min-h-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              숨기기
            </Button>
            {/*
              `추가` 는 이 줄의 주 동작이라 눈에 띄어야 하지만, 항목마다 반복되는 버튼을
              signal 주황으로 꽉 채우면 목록 전체가 주황 띠가 되어 정신없다(검수 지적과 같은 이유).
              그래서 채움 대신 **브랜드 틴트**를 쓴다 — 기존 토큰 `--wash`(주황 9%/다크 14%) 배경 +
              `--wash-strong` 테두리 + `--signal-ink` 글자. 새 색을 만들지 않았고, StateView 의
              brand 톤(border-wash-strong bg-wash text-signal-ink)과 같은 언어다.
              hover 에서 틴트만 한 단계 진해진다.
            */}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={add}
              disabled={busy}
              aria-busy={busy}
              aria-label={`${name} 내 관심사로 추가`}
              className="min-h-8 shrink-0 border-wash-strong bg-wash font-semibold text-signal-ink hover:bg-wash-strong hover:text-signal-ink dark:bg-wash dark:hover:bg-wash-strong"
            >
              <span aria-hidden="true">＋</span>
              추가
            </Button>
          </>
        )}
      </div>

      {/* 실패는 드물다 → 이때만 둘째 줄을 쓴다. 정상 상태의 한 줄 배치는 그대로 유지된다. */}
      {failed && (
        <p role="alert" className="pt-0.5 text-[11.5px] text-destructive">
          처리하지 못했어요. 다시 시도해 주세요.
        </p>
      )}
    </li>
  );
}
