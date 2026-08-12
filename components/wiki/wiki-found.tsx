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
 * - "추가" = POST /api/interests {name} → 성공 시 내 관심사 목록 refetch(후보가 아래 섹션으로 이동).
 *   409(이미 등록)는 목표 상태 달성으로 간주해 성공 처리한다(온보딩 replace 규칙과 동일).
 * - "숨기기" = POST /api/wiki/tags/blocks → 이 목록에서만 빼는 **추천 제외**다. 자료·관심사를
 *   지우지 않는다. 다만 해제(unblock) API 가 없어 화면에서 되돌릴 수 없으므로 확인 단계를 둔다.
 * - 목업의 "무시" 버튼은 만들지 않는다 — blocks 로 대체됐다. 후보가 0건이면 안내만 남긴다.
 *
 * <b>레이아웃 = 소형 카드(2026-08-12).</b> 08-11 에 칩으로 압축했는데, 칩은 이름만 담을 수 있어
 * ⑴ 추천 이유가 hover(title)에만 있었고 ⑵ 칩 본체=추가 / ×=숨기기라 아이콘 뜻을 추측해야 했다.
 * 이름 → 근거 한 줄 → `추가`·`숨기기` 텍스트 버튼 순의 작은 카드로 되돌리되, **기본 2건만**
 * 노출해 08-11 에 압축한 이유(세로로 길어짐)를 그대로 지킨다.
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
    ...fromTags.map((tag) => ({ key: tag.tagId, name: tag.tag, reason: tag.reasonMessages[0] })),
    ...restorable.map((name) => ({ key: `removed:${name}`, name, reason: undefined })),
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

type Candidate = { key: string; name: string; reason?: string };

/**
 * 섹션 껍데기 — 온디맨드 패널(.on-demand-panel)과 같은 rounded-[14px] border bg-card 컨테이너
 * (2026-08-11 우석). 카드만 배경 없이 떠 있으면 어디까지가 이 섹션인지 경계가 안 보인다.
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
  /** 처리 결과 낭독 — 카드가 사라지는 조작이라 시각 피드백만으로는 알 수 없다. */
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  const visible = expanded ? candidates : candidates.slice(0, FOUND_PREVIEW);
  const restCount = candidates.length - FOUND_PREVIEW;

  /** 추가·숨기기로 카드가 사라지면 포커스가 body 로 떨어진다 → 목록으로 되돌린다. */
  function recoverFocus() {
    listRef.current?.focus();
  }

  return (
    <FoundSection count={candidates.length}>
      <p className="mt-1 mb-3 text-[12.5px] leading-[1.6] text-muted-foreground">
        저장한 자료에서 AI가 찾은 주제예요. 추가하면 브리핑 주제로 쓰고, 숨기면 이 목록에서 빼요.
      </p>

      <ul ref={listRef} tabIndex={-1} className="flex flex-col gap-2 outline-none">
        {visible.map((candidate) => (
          <FoundCard
            key={candidate.key}
            name={candidate.name}
            reason={candidate.reason}
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
 * 후보 카드 1건 — 이름 → 근거 한 줄 → 행동 버튼 순.
 *
 * 근거는 `WikiTag.reasonMessages[0]`(constants/wiki.ts 확정 문구)만 쓴다. **없으면 줄 자체를
 * 렌더하지 않는다** — 신뢰도·저장 자료 개수 같은 없는 수치를 지어내지 않는다.
 *
 * 숨기기는 서버(V27)에 저장되고 해제 API 가 없어 화면에서 되돌릴 수 없다 → 2단계 확인을 둔다.
 * 추가는 [내 관심사]에서 다시 삭제하면 이 목록으로 돌아오므로 확인 없이 즉시 실행한다.
 */
function FoundCard({
  name,
  reason,
  onAdded,
  onHidden,
  announce,
  recoverFocus,
}: {
  name: string;
  reason?: string;
  onAdded: (name: string) => void;
  onHidden: (name: string) => void;
  announce: (message: string) => void;
  recoverFocus: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cardRef = useRef<HTMLLIElement>(null);
  const wasConfirming = useRef(false);

  /*
    확인 단계를 열면 확인 버튼으로, 취소하면 원래 `숨기기` 버튼으로 포커스를 옮긴다.
    ref 를 배열로 모으는 대신 카드 안에서 data 속성으로 찾는다(post-more-menu 와 같은 방식 —
    렌더 중 ref 접근을 피한다). 첫 렌더(confirming=false)에서는 포커스를 건드리지 않는다.
  */
  useEffect(() => {
    const root = cardRef.current;
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
      ref={cardRef}
      onKeyDown={(event) => {
        // 확인 단계에서 Esc = 취소. 팝오버가 아니라 카드 안 인라인 확인이라 직접 받는다.
        if (event.key !== "Escape" || !confirming) return;
        event.stopPropagation();
        setConfirming(false);
      }}
      className={`rounded-[10px] border bg-background px-3 py-2.5 ${
        failed ? "border-destructive" : "border-border"
      }`}
    >
      <p className="text-[13.5px] font-bold wrap-anywhere text-foreground">{name}</p>
      {reason !== undefined && (
        <p title={reason} className="mt-0.5 truncate text-[12px] leading-[1.6] text-muted-foreground">
          {reason}
        </p>
      )}

      {failed && (
        <p role="alert" className="mt-1 text-[11.5px] text-destructive">
          처리하지 못했어요. 다시 시도해 주세요.
        </p>
      )}

      {confirming ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-auto text-[12px] text-ink-mid">추천에서 숨길까요?</span>
          <Button
            type="button"
            data-confirm="hide"
            variant="destructive"
            size="sm"
            onClick={hide}
            disabled={busy}
            aria-busy={busy}
            className="min-h-9"
          >
            {busy ? "숨기는 중…" : "숨기기"}
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
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            disabled={busy}
            aria-busy={busy}
            aria-label={`${name} 내 관심사로 추가`}
            className="min-h-9 hover:border-primary hover:text-signal-ink"
          >
            <span aria-hidden="true">＋</span>
            {busy ? "추가하는 중…" : "추가"}
          </Button>
          <Button
            type="button"
            data-action="hide"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={busy}
            aria-label={`${name} 추천에서 숨기기`}
            className="min-h-9 text-muted-foreground hover:text-foreground"
          >
            숨기기
          </Button>
        </div>
      )}
    </li>
  );
}
