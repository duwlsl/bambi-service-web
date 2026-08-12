"use client";

import Link from "next/link";

import type { MyInterestsState } from "@/hooks/use-my-interests";
import type { OnDemandGenerationState } from "@/hooks/use-on-demand-generation";

/**
 * 온디맨드 보고서 생성 패널 — 내 관심사(GET /api/interests, source=USER) 1개를 골라
 * POST /api/reports/generate 로 생성을 **요청**한다.
 *
 * 데스크톱(홈 우측 rail)과 모바일([내 보고서] 탭 상단)이 **같은 컴포넌트**를 쓴다. 두 인스턴스가
 * 동시에 DOM 에 있어도 관심사 API 는 한 번만 나간다 — 조회·mutation 상태를 상위(HomeView)가
 * 1회 소유해 props 로 내려주고, 이 컴포넌트는 렌더만 한다.
 *
 * 두 인스턴스의 radio 가 서로를 덮어쓰지 않도록 `instanceId` 로 `name`·`id` 를 분리한다.
 * 선택 상태 자체는 공유 상태라 어느 쪽에서 고르든 양쪽이 같이 반영된다.
 *
 * **Wiki 태그는 이 화면에서 다루지 않는다.** 선택지는 이미 Service 에 저장된 관심사뿐이고,
 * Wiki 추천으로 생성하려면 사용자가 `/wiki` 에서 먼저 관심사로 추가해야 한다.
 *
 * 성공은 "요청 접수"까지만 알린다 — 완료로 표현하지 않고, 가짜 진행 카드도 만들지 않는다.
 */
export function OnDemandPanel({
  instanceId,
  interests,
  generation,
  className,
}: {
  instanceId: string;
  interests: MyInterestsState & { refetch: () => void };
  generation: OnDemandGenerationState;
  className?: string;
}) {
  return (
    <section
      aria-label="수동 보고서 생성"
      className={`rounded-[14px] border border-border bg-card px-4 py-[15px] ${className ?? ""}`}
    >
      <h2 className="text-[13px] font-bold text-foreground">수동 보고서 생성</h2>
      <p className="mt-1 text-[12px] leading-[1.6] text-muted-foreground">
        내 관심사 하나를 골라 바로 보고서를 요청하세요.
      </p>

      <div className="mt-3">
        {interests.status === "loading" && <InterestsSkeleton />}
        {interests.status === "error" && <InterestsError onRetry={interests.refetch} />}
        {interests.status === "success" &&
          (interests.data.length === 0 ? (
            <InterestsEmpty />
          ) : (
            <InterestPicker
              instanceId={instanceId}
              interests={interests.data}
              generation={generation}
            />
          ))}
      </div>
    </section>
  );
}

/**
 * 관심사 목록 + 제출. 실제 값이 1건 이상일 때만 렌더된다.
 *
 * 선택지는 목업 우측 rail 「추천 토픽」의 chip cloud(`.tpcs`/`.tpc` — gap 8 · radius 999 ·
 * padding 6/12 · 12.5px)를 그대로 쓴다(2026-08-07 UI 검수). 이전의 세로 radio 목록은 관심사가
 * 몇 개 없어도 패널이 길어지고 rail 의 다른 패널과 형식이 달랐다. **`#` 해시태그 표기는 붙이지
 * 않는다** — 추천 토픽과 달리 여기 값은 이미 내 관심사로 저장된 것이고, 해시태그는 태그 필터로
 * 이동한다는 뜻으로 읽힌다.
 *
 * 시각만 chip 으로 바뀌었을 뿐 **의미는 그대로 radio 그룹**이다 — input 을 sr-only 로 남겨
 * 단일 선택·화살표 키 이동·fieldset 그룹 이름이 전부 유지된다(가짜 button 토글로 바꾸지 않는다).
 */
function InterestPicker({
  instanceId,
  interests,
  generation,
}: {
  instanceId: string;
  interests: NonNullable<Extract<MyInterestsState, { status: "success" }>["data"]>;
  generation: OnDemandGenerationState;
}) {
  const groupName = `on-demand-topic-${instanceId}`;

  return (
    <>
      {/* 단일 선택 radio. fieldset/legend 로 그룹 이름을 스크린리더에 전달한다. */}
      <fieldset className="min-w-0">
        <legend className="sr-only">보고서를 만들 관심사 선택</legend>
        {/* .tpcs — chip cloud(가로 배치 + 자연 wrap) */}
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => {
            const inputId = `${groupName}-${interest.id}`;
            const checked = generation.selected?.id === interest.id;
            return (
              /* .tpc — 선택 chip 은 목업 `.tpc.plus` 와 같은 wash·signal-ink 로 상태를 알린다.
                 긴 관심사명도 300px rail 을 넘기지 않게 줄바꿈한다(가로 스크롤 금지).

                 `wrap-anywhere`(overflow-wrap:anywhere)를 쓴다. 이전의 `break-words`
                 (overflow-wrap:break-word)로는 부족했다 — break-word 는 **줄 안에서만** 끊고
                 요소의 min-content 폭은 줄이지 않는데, chip 은 inline-flex 라 안쪽 텍스트가
                 min-width:auto 인 익명 flex 항목이 된다. 게다가 전역 `word-break: keep-all`
                 (app/globals.css)이 한글 어절 중간 분절까지 막아서, 공백 없는 긴 관심사명이
                 통째로 min-content 가 됐다(실측 339px) → rail·모바일에서 가로 스크롤 발생.
                 anywhere 는 min-content 계산에도 반영돼 chip 이 컨테이너 폭까지 줄어든다. */
              <label
                key={interest.id}
                htmlFor={inputId}
                className={`focus-within:ring-wash inline-flex max-w-full min-w-0 items-center rounded-full border px-3 py-1.5 text-[12.5px] leading-[1.45] wrap-anywhere focus-within:ring-[3px] ${
                  generation.submitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${
                  checked
                    ? "border-primary bg-wash font-semibold text-signal-ink"
                    : "border-input bg-background text-ink-mid hover:bg-card"
                }`}
              >
                <input
                  type="radio"
                  id={inputId}
                  name={groupName}
                  value={String(interest.id)}
                  checked={checked}
                  onChange={() => generation.select(interest)}
                  disabled={generation.submitting}
                  className="sr-only"
                />
                {interest.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={generation.submit}
        disabled={!generation.canSubmit}
        aria-busy={generation.submitting}
        className="focus-ring mt-3 inline-flex w-full items-center justify-center rounded-lg border border-primary bg-primary px-3 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-primary-foreground hover:brightness-[.96] disabled:opacity-50"
      >
        {generation.submitting ? "요청 중…" : "선택한 관심사로 만들기"}
      </button>

      {/*
        접수 성공 — "완료"가 아니라 "요청함"이다. 여기서 진행 카드·완료 시각·이동 링크를 만들지
        않는다(Pending 조회가 별도 범위라 진행 상태를 알 방법이 없다).
      */}
      {generation.accepted && (
        <p role="status" className="mt-2 text-[12px] leading-[1.6] text-signal-ink">
          보고서 생성을 요청했어요.
        </p>
      )}

      {/* 오류 — 공통 매핑 문구만 쓴다(서버 원문 미노출). 선택은 유지돼 바로 재시도할 수 있다. */}
      {generation.errorMessage !== null && (
        <p role="alert" className="mt-2 text-[12px] leading-[1.6] text-ink-mid">
          {generation.errorMessage}
        </p>
      )}
    </>
  );
}

/**
 * 관심사 0건 — 이 화면에서 관심사를 만들지 않는다(생성 버튼이 관심사를 몰래 추가하면
 * 사용자가 등록한 적 없는 관심사가 생긴다). 실제 관리 화면으로 보낸다.
 */
function InterestsEmpty() {
  return (
    <>
      <p className="text-[12.5px] leading-[1.6] text-muted-foreground">
        먼저 관심사를 추가해 주세요.
      </p>
      {/* /wiki = 좌측 메뉴의 "관심사 · LLM Wiki" 실제 라우트(lib/mock/feed.ts MOCK_MENU). */}
      <Link
        href="/wiki"
        className="focus-ring mt-2.5 inline-flex w-full items-center justify-center rounded-lg border border-border bg-transparent px-3 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-ink-mid hover:bg-background"
      >
        관심사 관리하기 →
      </Link>
    </>
  );
}

/** 조회 실패 — rail 범위에서만 알리고 재시도를 제공한다(이전 값·mock 으로 대체하지 않는다). */
function InterestsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert">
      <p className="text-[12.5px] leading-[1.6] text-ink-mid">
        관심사를 불러오지 못했어요. 일시적인 문제일 수 있어요.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-2.5 inline-flex w-full items-center justify-center rounded-lg border border-border bg-transparent px-3 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-ink-mid hover:bg-background"
      >
        다시 시도
      </button>
    </div>
  );
}

/** 로딩 — 중립 placeholder(선택지 chip 골격). 실제 관심사명을 먼저 노출하지 않는다. */
function InterestsSkeleton() {
  // chip 폭은 관심사명 길이에 따라 달라지므로 골격도 서로 다른 폭으로 둔다(가짜 이름 금지).
  const chipWidths = ["w-20", "w-28", "w-16", "w-24"];
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="flex flex-wrap gap-2">
        {chipWidths.map((w) => (
          <div key={w} className={`h-[29px] rounded-full bg-[var(--skel1)] ${w}`} />
        ))}
      </div>
      <div className="mt-3 h-[31px] w-full rounded-md bg-[var(--skel1)]" />
    </div>
  );
}
