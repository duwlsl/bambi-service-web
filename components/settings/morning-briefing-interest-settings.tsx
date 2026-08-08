"use client";

import Link from "next/link";
import { useState } from "react";

import { ChipCheckIcon, ChipPlusIcon } from "@/components/onboarding/interest-picker";
import { useWikiInterests } from "@/hooks/use-wiki-interests";
import type { WikiTag } from "@/types/wiki";

/**
 * 설정 「보고서」 — 아침 브리핑에 쓸 Wiki 관심사 선택.
 *
 * 선택지 = **LLM Wiki 관심사**(`GET /api/wiki/tags`, `useWikiInterests`). `/wiki` 가 쓰는 조회 경로를
 * 그대로 재사용한다. Service 관심사(`GET /api/interests`, source=USER)는 여기 선택지가 아니다 —
 * 아침 브리핑은 "AI 가 파악한 내 Wiki 관심사 중 미리 고른 것"을 쓰기 때문이다.
 *
 * ⚠️ **아직 서버 저장이 없다.** 선택값을 보관하는 API 계약이 확정되지 않아 이 단계는 **선택 화면과
 * 선택 로직만** 구현한다. 저장/적용 버튼·localStorage·sessionStorage·cookie·URL query 어디에도
 * 값을 남기지 않고, 우측 rail(`SettingsRail`)에도 "현재 설정"으로 올리지 않는다 — 저장되지 않은 값을
 * 저장된 것처럼 보이게 하지 않기 위해서다(동작하지 않는 UI 금지). 선택은 **컴포넌트 메모리에만** 있고
 * 페이지를 벗어나면 사라진다. 그 사실을 "임시 저장" 같은 문구로 포장하지도 않는다.
 *
 * 저장 API 가 생기면 초기 `selectedNames` 를 서버 names[] 로 채우고 저장 호출만 덧붙이면 되도록
 * 선택 상태를 **이름 기준**으로 들고 있다(§선택 identity).
 */

/** 아침 브리핑이 쓰는 주제 수의 상한. 실제 필요 개수는 `min(3, 고를 수 있는 관심사 수)`. */
const MAX_SELECTION = 3;

export function MorningBriefingInterestSettings() {
  const interests = useWikiInterests();

  return (
    /* .set-sec — 「화면」·「계정」 섹션(settings-screen.tsx SettingsSection)과 같은 카드·간격. */
    <section className="mb-3.5 rounded-2xl border border-border bg-card px-[22px] py-1.5">
      <h2 className="pt-4 pb-1 text-[14.5px] font-bold text-foreground">보고서</h2>

      {/* .srow — 라벨·설명 아래에 chip cloud 를 폭 전체로 둔다(우측 컨트롤 자리에 두면 chip 이 눌린다). */}
      <div className="border-b border-border py-[15px] last:border-b-0">
        <div className="text-[13.5px] font-semibold text-foreground">아침 브리핑 관심사</div>
        <div className="mt-[3px] text-[12px] leading-[1.55] text-muted-foreground">
          매일 아침 받아볼 주제를 Wiki 관심사에서 선택하세요.
        </div>

        <div className="mt-3">
          {interests.status === "loading" && <InterestsSkeleton />}
          {interests.status === "error" && <InterestsError onRetry={interests.refetch} />}
          {interests.status === "empty" && <InterestsEmpty />}
          {interests.status === "success" && <InterestPicker tags={interests.data} />}
        </div>
      </div>
    </section>
  );
}

/** 선택지 1건 — `key` 는 React 렌더용 tagId, 의미적 identity 는 `name` 이다. */
type InterestOption = { key: string; name: string };

/**
 * 선택 identity = **관심사 이름**.
 *
 * Wiki 재계산 때 tagId 가 새로 발급될 수 있어 id 를 사용자 preference 의 durable key 로 쓰면
 * 선택이 통째로 깨진다. 서버 저장도 names[] 기준으로 갈 예정이라 지금부터 이름으로 맞춘다.
 * 서버가 준 이름은 그대로 쓴다 — lowercase 변환·새 이름 생성 금지(어댑터가 trim·빈값 제외까지는 이미 했다).
 *
 * 같은 이름이 두 번 오면 chip 도 두 개가 되는데 선택 상태는 이름 하나라 둘이 함께 켜진 것처럼 보인다.
 * 그래서 이름 기준으로 **먼저 온 것만** 남긴다(표시에서 빼는 것뿐, 이름을 바꾸지 않는다).
 */
function toOptions(tags: WikiTag[]): InterestOption[] {
  const seen = new Set<string>();
  const options: InterestOption[] = [];
  for (const tag of tags) {
    if (seen.has(tag.tag)) continue;
    seen.add(tag.tag);
    options.push({ key: tag.tagId, name: tag.tag });
  }
  return options;
}

/**
 * 관심사 chip cloud — 다중 선택.
 *
 * 시각은 온디맨드 패널의 chip(`.tpc` — gap 8 · radius 999 · padding 6/12 · 12.5px)과 같은 계열이고,
 * ＋/✓ 아이콘은 온보딩 chip 과 공유한다(선택 상태를 색만으로 전달하지 않는다 · 아이콘 자리가 항상
 * 있어 토글해도 chip 폭이 튀지 않는다).
 *
 * **semantics 는 온디맨드와 다르다.** 온디맨드는 1개만 고르는 radio 지만 여기는 다중 선택이라
 * checkbox 로 둔다 — input 을 sr-only 로 남겨 Space 토글·checked 낭독·fieldset 그룹 이름이 유지된다.
 *
 * 상한에 닿아도 **이미 선택한 chip 은 계속 해제할 수 있어야** 다른 주제로 교체할 수 있다.
 * 그래서 막는 대상은 미선택 chip 뿐이고, 그것도 `disabled`(포커스 자체가 안 감) 대신
 * `aria-disabled` + 변경 무시로 둬서 무엇이 왜 막혔는지 키보드로도 확인할 수 있게 한다.
 */
function InterestPicker({ tags }: { tags: WikiTag[] }) {
  const options = toOptions(tags);
  // 자동 선택하지 않는다 — 상위 3개를 미리 켜두면 사용자가 고른 값과 구분되지 않는다.
  const [selectedNames, setSelectedNames] = useState<ReadonlySet<string>>(() => new Set<string>());

  // 관심사가 3개 미만이면 있는 만큼만 고른다(없는 선택지를 요구하지 않는다).
  const requiredCount = Math.min(MAX_SELECTION, options.length);
  const atLimit = selectedNames.size >= requiredCount;

  function toggle(name: string) {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        return next;
      }
      if (next.size >= requiredCount) return prev; // 상한 도달 — 추가 선택만 막는다
      next.add(name);
      return next;
    });
  }

  return (
    <>
      <fieldset className="min-w-0">
        <legend className="sr-only">아침 브리핑 관심사 선택</legend>
        {/* chip cloud — 가로 배치 + 자연 wrap(가로 스크롤 금지) */}
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const checked = selectedNames.has(option.name);
            const blocked = !checked && atLimit;
            const inputId = `morning-briefing-interest-${option.key}`;
            return (
              <label
                key={option.key}
                htmlFor={inputId}
                className={`focus-within:ring-wash inline-flex max-w-full min-w-0 items-center gap-[7px] rounded-full border px-3 py-1.5 text-[12.5px] leading-[1.45] break-words focus-within:ring-[3px] ${
                  checked
                    ? "border-primary bg-wash font-semibold text-signal-ink"
                    : "border-input bg-background text-ink-mid"
                } ${blocked ? "cursor-not-allowed opacity-50" : `cursor-pointer ${checked ? "" : "hover:bg-card"}`}`}
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
                  className="sr-only"
                />
                {checked ? <ChipCheckIcon /> : <ChipPlusIcon />}
                {/* 이름은 별도 span 으로 감싼다 — flex item 의 기본 `min-width:auto` 때문에 공백 없는
                    긴 토큰이 chip 폭을 넘어 화면 밖으로 밀려나간다. min-w-0 이 있어야 실제로 줄바꿈된다. */}
                <span className="min-w-0 break-words">{option.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 선택 수 — 필요 개수를 채워도 "저장됨"이라고 말하지 않는다(서버에 저장되지 않았다). */}
      <p aria-live="polite" className="mt-3 text-[12px] leading-[1.6] text-muted-foreground">
        선택 <b className="font-bold text-signal-ink">{selectedNames.size}</b> / {requiredCount}
      </p>

      {/* 고를 수 있는 게 더 남았는데 상한에 닿았을 때만 — 교체 경로를 알려준다. */}
      {atLimit && options.length > requiredCount && (
        <p className="mt-1 text-[12px] leading-[1.6] text-muted-foreground">
          최대 {requiredCount}개까지 고를 수 있어요. 다른 주제로 바꾸려면 선택한 관심사를 먼저 해제하세요.
        </p>
      )}
    </>
  );
}

/**
 * Wiki 관심사 0건 — 기본값·가짜 관심사를 만들지 않는다.
 * Wiki 관심사는 저장한 자료에서 AI 가 뽑는 값이라 이 화면에서도 `/wiki` 에서도 직접 만들 수 없다.
 * "관심사를 추가하세요"라고 하면 없는 기능을 약속하게 되므로 실제 동작(자료 저장)만 안내한다.
 */
function InterestsEmpty() {
  return (
    <>
      <p className="text-[12.5px] leading-[1.6] text-muted-foreground">
        아직 선택할 Wiki 관심사가 없어요. 관심 자료를 저장하면 AI가 주제를 찾아내요.
      </p>
      <Link
        href="/wiki"
        className="focus-ring mt-2.5 inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-background"
      >
        관심사 확인하기 →
      </Link>
    </>
  );
}

/** 조회 실패 — 이 섹션 범위에서만 알리고 재시도를 제공한다(서버 error.message 원문은 쓰지 않는다). */
function InterestsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert">
      <p className="text-[12.5px] leading-[1.6] text-ink-mid">
        관심사를 불러오지 못했어요. 일시적인 문제일 수 있어요.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-2.5 inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-background"
      >
        다시 시도
      </button>
    </div>
  );
}

/** 로딩 — chip 골격만. 실제 관심사명을 먼저 지어내지 않는다(온디맨드 패널과 같은 방식). */
function InterestsSkeleton() {
  // chip 폭은 관심사명 길이에 따라 달라지므로 골격도 서로 다른 폭으로 둔다.
  const chipWidths = ["w-24", "w-32", "w-20", "w-28", "w-16"];
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="flex flex-wrap gap-2">
        {chipWidths.map((w) => (
          <div key={w} className={`h-8 rounded-full bg-[var(--skel1)] ${w}`} />
        ))}
      </div>
      <div className="mt-3 h-[19px] w-20 rounded-md bg-[var(--skel1)]" />
    </div>
  );
}
