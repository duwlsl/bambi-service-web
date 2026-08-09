"use client";

import Link from "next/link";
import { useState } from "react";

import { ChipPlusIcon } from "@/components/onboarding/interest-picker";
import { Button } from "@/components/ui/button";
import type { useBriefingTopics } from "@/hooks/use-briefing-topics";
import type { MyInterestsState } from "@/hooks/use-my-interests";
import type { WikiInterestsState } from "@/hooks/use-wiki-interests";

/**
 * [아침 브리핑 주제] — 매일 아침 받아볼 주제를 미리 골라 저장한다. **편집이 일어나는 유일한 곳**이다.
 *
 * 여기 있는 이유: 이 값이 바꾸는 것은 곧 이 탭에 쌓이는 보고서다. 설정 화면이나 Wiki 본문에 두면
 * "무엇을 바꾸는 설정인지" 결과와 떨어져 보인다. `/wiki` 의 rail 은 지금 값 요약과 이 자리로 오는
 * 링크만 두고 편집·저장은 하지 않는다.
 *
 * 선택지 = **AI 가 추론한 관심 태그(`GET /api/wiki/tags`) ∪ 직접 설정한 관심사(`GET /api/interests`)**.
 * 둘 다 Wiki 에서 관리하는 내 관심사라 한쪽만 후보로 두면 직접 등록한 주제를 쓸 수 없다.
 * 관심사 자체를 고치는 곳은 `/wiki` 라 「관심사 관리」 링크로 연결한다.
 *
 * 저장 계약은 `GET/PUT /api/users/me/briefing-topics`(service-api #65) — **이름 문자열 배열**이다.
 * `interest_id`(UUID)로 저장하지 않는다: 관심 Profile 재계산마다 id 가 새로 발급돼 미리 골라둔
 * 값이 다음 재계산에 죽는다. agent 계약도 `topics[]` = 이름 배열이라 변환이 없다.
 *
 * 노출 방식: **저장값이 없으면 펼친 상태**(고를 게 있다는 걸 알려야 한다), 있으면 한 줄 요약으로
 * 접어 둔다 — 이 자리는 보고서 목록 바로 위라 매번 펼쳐 두면 목록이 아래로 밀린다.
 *
 * 서버 저장값(`briefing` 훅)과 로컬 편집값(`selectedNames`)은 분리한다. 낙관적 갱신을 하지 않으며
 * PUT 성공 응답(정규화 결과)을 받은 뒤에만 저장 상태가 바뀐다.
 */

/** 아침 브리핑이 쓰는 주제 수의 상한. 서버(BriefingTopicService.MAX_TOPICS)와 같은 값이다. */
const MAX_SELECTION = 3;

export function BriefingTopicsPanel({
  tags,
  myInterests,
  briefing,
  openOnMount = false,
  className,
}: {
  tags: WikiInterestsState & { refetch: () => void };
  myInterests: MyInterestsState & { refetch: () => void };
  briefing: ReturnType<typeof useBriefingTopics>;
  /** `/?briefing=edit` 로 들어온 경우 — Wiki rail 에서 "주제 변경"을 눌렀을 때 바로 편집을 연다. */
  openOnMount?: boolean;
  className?: string;
}) {
  // 세 소스가 **모두** 확정돼야 후보와 초기 선택을 옳게 만들 수 있다. 하나라도 미확정이면 편집 UI 를
  // 그리지 않는다 — 후보가 빠진 채로 그리면 저장된 주제를 "현재 관심사에 없음"으로 잘못 표시하고,
  // 저장값 없이 그리면 "선택 0개"로 보여 그대로 저장할 때 기존 선택이 지워진다.
  const loading =
    tags.status === "loading" || myInterests.status === "loading" || briefing.status === "loading";
  const failed =
    tags.status === "error" || myInterests.status === "error" || briefing.status === "error";

  function retry() {
    if (tags.status === "error") tags.refetch();
    if (myInterests.status === "error") myInterests.refetch();
    if (briefing.status === "error") briefing.refetch();
  }

  return (
    <section
      aria-label="아침 브리핑 주제"
      className={`rounded-[14px] border border-border bg-card px-4 py-3 ${className ?? ""}`}
    >
      {loading && <PanelSkeleton />}
      {!loading && failed && <PanelError onRetry={retry} />}
      {!loading && !failed && briefing.status === "success" && (
        <TopicEditor
          wikiNames={tags.status === "success" ? tags.data.map((tag) => tag.tag) : []}
          userNames={myInterests.status === "success" ? myInterests.data.map((it) => it.name) : []}
          savedTopics={briefing.data}
          briefing={briefing}
          openOnMount={openOnMount}
        />
      )}
    </section>
  );
}

/** 선택지 1건. `key` 는 React 렌더용, 의미적 identity 는 `name` 이다. */
type TopicOption = {
  key: string;
  name: string;
  /** AI·직접 설정 어느 목록에도 없는, 이미 저장돼 있던 주제. */
  missing: boolean;
};

/**
 * 이름 비교 키 — 이 프로젝트의 다른 교차 비교(wiki-found·wiki-my-interests)와 같은 규칙이다.
 * AI 태그와 직접 설정 관심사는 출처가 달라 같은 주제가 대소문자·앞뒤 공백만 다르게 올 수 있다.
 */
function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * 후보 = **AI 추론 관심사 ∪ 직접 설정 관심사 ∪ 저장된 주제**.
 *
 * 순서는 Wiki 화면에서 본 순서를 따른다(AI → 직접 설정). 같은 이름은 **먼저 온 것만** 남기고,
 * 표시 이름은 변형하지 않는다 — 서버가 준 이름이 그대로 저장·전송값이다.
 *
 * 저장돼 있는데 어느 목록에도 없는 이름은 **숨기지도, 자동 해제하지도 않는다.** Wiki 에서 그
 * 관심사를 지워도 아침 브리핑 선택은 사용자가 직접 뺄 때까지 남아야 한다(서버도 같은 이유로
 * 이름 유효성을 검증하지 않는다).
 */
function toOptions(wikiNames: string[], userNames: string[], savedTopics: string[]): TopicOption[] {
  const seen = new Set<string>();
  const options: TopicOption[] = [];

  const push = (name: string, prefix: string, missing: boolean) => {
    const key = nameKey(name);
    if (key === "" || seen.has(key)) return;
    seen.add(key);
    options.push({ key: `${prefix}-${key}`, name, missing });
  };

  for (const name of wikiNames) push(name, "ai", false);
  for (const name of userNames) push(name, "user", false);
  for (const name of savedTopics) push(name, "saved", true);
  return options;
}

/** 두 목록이 **순서까지** 같은지(이름 비교 규칙 동일). 순서가 리포트 섹션 순서라 순서 변경도 저장 대상이다. */
function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((name, i) => nameKey(name) === nameKey(b[i]));
}

/**
 * 요약 ↔ 편집 전환 + chip 선택 + 저장.
 *
 * chip 시각은 온디맨드 패널 계열이고 ＋/✓ 아이콘은 온보딩 chip 과 공유한다(선택 상태를 색만으로
 * 전달하지 않는다 · 아이콘 자리가 항상 있어 토글해도 chip 폭이 튀지 않는다). **AI 태그든 직접 설정
 * 관심사든 같은 chip** 이다 — 아침 브리핑 입장에서 둘은 동등한 후보라 출처로 모양을 나누지 않는다.
 *
 * semantics 는 checkbox 다(다중 선택). input 을 sr-only 로 남겨 Space 토글·checked 낭독·
 * fieldset 그룹 이름이 유지되고, chip 처럼 보이는 탓에 먼저 누르게 되는 Enter 도 함께 받는다.
 *
 * 상한에 닿아도 **이미 선택한 chip 은 계속 해제할 수 있어야** 교체가 가능하다. 그래서 막는 대상은
 * 미선택 chip 뿐이고, `disabled`(포커스 자체가 안 감) 대신 `aria-disabled` + 변경 무시로 둔다.
 *
 * 선택 상태는 **순서 있는 배열**이다. 해제 후 다시 고르면 배열 끝으로 가고, 그 순서 그대로
 * `topics[]` 로 직렬화된다(agent 계약상 순서 = 리포트 섹션 순서).
 */
function TopicEditor({
  wikiNames,
  userNames,
  savedTopics,
  briefing,
  openOnMount,
}: {
  wikiNames: string[];
  userNames: string[];
  savedTopics: string[];
  briefing: ReturnType<typeof useBriefingTopics>;
  openOnMount: boolean;
}) {
  const options = toOptions(wikiNames, userNames, savedTopics);
  // 저장값이 없으면 펼쳐서 시작한다(고를 수 있다는 걸 알려야 한다). 있으면 접어 둬서 보고서 목록이
  // 아래로 밀리지 않게 한다. rail 에서 "주제 변경"으로 들어온 경우는 항상 펼친다.
  const [open, setOpen] = useState(() => openOnMount || savedTopics.length === 0);
  // 초기값 = 서버 저장값(순서 그대로). 자동 선택하지 않는다. 저장값 표기가 후보와 대소문자만 다르면
  // 후보 쪽 이름으로 맞춘다(같은 주제다).
  const [selectedNames, setSelectedNames] = useState<readonly string[]>(() =>
    savedTopics.map((topic) => options.find((o) => nameKey(o.name) === nameKey(topic))?.name ?? topic),
  );

  // 후보에서 사라진 선택(저장 전에 그 관심사를 지운 경우)은 집계·저장에서 제외한다. 저장된 주제는
  // savedTopics 를 통해 항상 후보에 남으므로 여기 걸리지 않는다 — 자동 해제되지 않는다.
  const optionKeys = new Set(options.map((option) => nameKey(option.name)));
  const selected = selectedNames.filter((name) => optionKeys.has(nameKey(name)));

  const requiredCount = Math.min(MAX_SELECTION, options.length);
  const atLimit = selected.length >= requiredCount;
  const dirty = !sameOrder(selected, savedTopics);
  const { saving, savedOnce, saveErrorMessage } = briefing;

  function toggle(name: string) {
    briefing.clearSaveResult(); // 옛 저장 결과 문구가 새 선택에 붙어 보이지 않게
    setSelectedNames((prev) => {
      if (prev.some((selectedName) => nameKey(selectedName) === nameKey(name))) {
        return prev.filter((selectedName) => nameKey(selectedName) !== nameKey(name));
      }
      if (prev.filter((n) => optionKeys.has(nameKey(n))).length >= requiredCount) return prev;
      return [...prev, name]; // 다시 고른 주제는 마지막 순서로 간다
    });
  }

  function submit() {
    // 사용자가 고른 순서 그대로 보낸다. 변환·정렬하지 않는다.
    briefing.save([...selected], (normalized) => setSelectedNames(normalized));
  }

  /* ── 접힌 상태: 한 줄 요약 ── */
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[13px] font-bold whitespace-nowrap text-foreground">아침 브리핑 주제</span>
        {/* 저장된 값만 보여준다(편집 중인 값이 아니다). 길면 줄바꿈. */}
        <span className="min-w-0 flex-1 text-[12.5px] leading-[1.5] break-words text-ink-mid">
          {savedTopics.length > 0 ? savedTopics.join(" · ") : "선택 안 함"}
          <span className="text-muted-foreground"> · {savedTopics.length}개</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring shrink-0 rounded-lg border border-border bg-background px-2.5 py-1 text-[12px] font-semibold text-ink-mid hover:bg-card"
        >
          변경
        </button>
      </div>
    );
  }

  /* ── 펼친 상태: chip 선택 + 저장 ── */
  return (
    <>
      {/* 설명은 **아직 고른 적 없을 때만** 둔다. 이미 고른 사람은 `변경`을 눌러 여기 온 것이라
          같은 안내를 다시 읽을 이유가 없다(상한은 아래 `선택 n / 3` 이 이미 말한다). */}
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-[13px] font-bold text-foreground">아침 브리핑 주제</h2>
        {savedTopics.length === 0 && (
          <p className="min-w-0 flex-1 text-[12px] leading-[1.5] text-muted-foreground">
            매일 아침 받아볼 주제를 골라두세요.
          </p>
        )}
        {/* 관심사 자체를 고치는 곳은 Wiki 다. 후보가 마음에 안 들면 여기서 바로 갈 수 있게 한다. */}
        <Link
          href="/wiki"
          className="focus-ring ml-auto shrink-0 rounded-[6px] text-[12px] font-semibold text-signal-ink hover:underline"
        >
          관심사 관리 →
        </Link>
      </div>

      {options.length === 0 ? (
        <p className="text-[12.5px] leading-[1.6] text-muted-foreground">
          아직 고를 주제가 없어요. 관심사를 추가하거나 관심 자료를 저장하면 후보로 올라와요.
        </p>
      ) : (
        <>
          <fieldset className="min-w-0" disabled={saving}>
            <legend className="sr-only">아침 브리핑 주제 선택</legend>
            {/* chip cloud — 가로 배치 + 자연 wrap(가로 스크롤 금지) */}
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const checked = selected.some((name) => nameKey(name) === nameKey(option.name));
                const blocked = !checked && atLimit;
                const inputId = `briefing-topic-${option.key}`;
                return (
                  <label
                    key={option.key}
                    htmlFor={inputId}
                    title={option.missing ? "지금 내 관심사 목록에는 없는 주제예요." : undefined}
                    className={`focus-within:ring-wash inline-flex max-w-full min-w-0 items-center gap-[7px] rounded-full border px-3 py-1.5 text-[12.5px] leading-[1.45] break-words focus-within:ring-[3px] ${
                      checked
                        ? "border-primary bg-wash font-semibold text-signal-ink"
                        : "border-input bg-background text-ink-mid"
                    } ${option.missing ? "border-dashed" : ""} ${
                      saving
                        ? "cursor-not-allowed opacity-60"
                        : blocked
                          ? "cursor-not-allowed opacity-50"
                          : `cursor-pointer ${checked ? "" : "hover:bg-card"}`
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={inputId}
                      checked={checked}
                      aria-disabled={blocked || undefined}
                      onChange={() => {
                        if (blocked) return;
                        toggle(option.name);
                      }}
                      // checkbox 는 Space 만 토글하는 게 표준이지만, 이 chip 은 버튼처럼 보여서
                      // Enter 를 먼저 누르게 된다. 폼 안이 아니라 Enter 를 가로채도 제출이 깨지지 않는다.
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        if (blocked) return;
                        toggle(option.name);
                      }}
                      className="sr-only"
                    />
                    {/* 선택 chip 은 ✓ 대신 **순서 번호**를 단다 — 선택됐다는 사실과 몇 번째인지를
                        한 자리에서 알려, 아래에 순서를 다시 적는 줄이 필요 없어진다.
                        낭독은 번호가 아니라 "n번째"로 들리게 분리한다. */}
                    {checked ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-primary text-[10px] leading-none font-bold text-primary-foreground"
                        >
                          {selected.findIndex((name) => nameKey(name) === nameKey(option.name)) + 1}
                        </span>
                        <span className="sr-only">
                          {selected.findIndex((name) => nameKey(name) === nameKey(option.name)) + 1}번째
                        </span>
                      </>
                    ) : (
                      <ChipPlusIcon />
                    )}
                    {/* 이름은 별도 span 으로 감싼다 — flex item 의 기본 `min-width:auto` 때문에 공백 없는
                        긴 토큰이 chip 폭을 넘어 화면 밖으로 밀려나간다. min-w-0 이 있어야 줄바꿈된다. */}
                    <span className="min-w-0 break-words">{option.name}</span>
                    {/* 색·점선 외에 글자로도 남긴다(스크린리더 포함). */}
                    {option.missing && (
                      <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
                        · 현재 관심사에 없음
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 선택 수 한 줄. 순서는 chip 의 번호가 보여주고, 상한 안내는 아직 고를 게 남았을 때만
              같은 줄에 짧게 덧붙인다(문장 3개를 줄 하나로 합친 자리다). */}
          <p aria-live="polite" className="mt-2.5 text-[12px] leading-[1.6] text-muted-foreground">
            선택 <b className="font-bold text-signal-ink">{selected.length}</b> / {requiredCount}
            {atLimit && options.length > requiredCount && (
              <span> · 바꾸려면 선택한 주제를 먼저 해제하세요</span>
            )}
          </p>
        </>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="button" size="sm" onClick={submit} disabled={!dirty || saving} aria-busy={saving}>
          {saving ? "저장 중…" : "저장"}
        </Button>
        {/* 저장값이 있을 때만 접을 수 있다 — 0개일 때 접으면 고를 게 있다는 사실이 가려진다. */}
        {savedTopics.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-ring rounded-lg px-2 py-1 text-[12px] font-semibold text-muted-foreground hover:text-ink-mid"
          >
            접기
          </button>
        )}

        {/* 저장 성공 — 서버 응답을 받은 뒤에만 뜬다. 결과가 빈 목록이면 "저장했어요"라고 하지 않는다
            (아무것도 안 고른 채 그 문구가 뜨면 무엇이 저장됐는지 알 수 없다). */}
        {savedOnce && !dirty && (
          <span role="status" className="text-[12px] leading-[1.6] text-signal-ink">
            {savedTopics.length > 0
              ? `${savedTopics.length}개 주제를 저장했어요.`
              : "선택을 모두 해제했어요."}
          </span>
        )}
        {/* 저장 실패 — 공통 매핑 문구만 쓴다(서버 원문 미노출). 선택은 유지돼 바로 재시도할 수 있다. */}
        {saveErrorMessage !== null && (
          <span role="alert" className="text-[12px] leading-[1.6] text-ink-mid">
            {saveErrorMessage}
          </span>
        )}
      </div>
    </>
  );
}

/**
 * 조회 실패 — 이 패널 범위에서만 알리고 재시도를 제공한다(서버 error.message 원문은 쓰지 않는다).
 * **빈 목록으로 대체하지 않는다** — 실패를 "선택 없음"으로 보여주면 그 상태로 저장할 때 기존 선택이 지워진다.
 */
function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[12.5px] leading-[1.6] text-ink-mid">
        아침 브리핑 주제를 불러오지 못했어요.
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring shrink-0 rounded-lg border border-border bg-background px-2.5 py-1 text-[12px] font-semibold text-ink-mid hover:bg-card"
      >
        다시 시도
      </button>
    </div>
  );
}

/** 로딩 — 한 줄 골격. 접힌 요약과 같은 높이라 확정 후 레이아웃이 튀지 않는다. */
function PanelSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse items-center gap-3">
      <div className="h-[17px] w-28 rounded-md bg-[var(--skel1)]" />
      <div className="h-[17px] w-40 rounded-md bg-[var(--skel1)]" />
      <div className="ml-auto h-[26px] w-12 rounded-lg bg-[var(--skel1)]" />
    </div>
  );
}
