"use client";

import type { DevelopmentReportGenerationState } from "@/hooks/use-development-report-generation";
import type { WikiInterestsState } from "@/hooks/use-wiki-interests";

/** 개발 서버에서 실제 아침·Wiki 관심사 리포트 생성 경로를 각각 실행하는 테스트 패널. */
export function DevelopmentReportPanel({
  instanceId,
  wikiInterests,
  generation,
  className,
}: {
  instanceId: string;
  wikiInterests: WikiInterestsState & { refetch: () => void };
  generation: DevelopmentReportGenerationState;
  className?: string;
}) {
  return (
    <section
      aria-label="개발용 리포트 테스트"
      className={`rounded-[14px] border border-border bg-card px-4 py-[15px] ${className ?? ""}`}
    >
      <h2 className="text-[13px] font-bold text-foreground">개발용 리포트 테스트</h2>
      <p className="mt-1 text-[12px] leading-[1.6] text-muted-foreground">
        실제 리포트와 알림이 생성되며 LLM 비용이 발생합니다.
      </p>

      <div className="mt-3 border-t border-border pt-3">
        <h3 className="text-[12.5px] font-semibold text-foreground">아침 리포트</h3>
        <p className="mt-0.5 text-[12px] leading-[1.55] text-muted-foreground">
          현재 아침 브리핑 주제 선정 경로를 바로 실행합니다.
        </p>
        <button
          type="button"
          onClick={generation.morning.submit}
          disabled={generation.morning.submitting}
          aria-busy={generation.morning.submitting}
          className="focus-ring mt-2.5 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-3 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-ink-mid hover:bg-card disabled:opacity-50"
        >
          {generation.morning.submitting ? "요청 중…" : "아침 리포트 즉시 생성"}
        </button>
        <ActionResult
          accepted={generation.morning.accepted}
          success="아침 리포트 생성을 요청했어요."
          errorMessage={generation.morning.errorMessage}
        />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <h3 className="text-[12.5px] font-semibold text-foreground">Wiki 관심사 리포트</h3>
        <p className="mt-0.5 text-[12px] leading-[1.55] text-muted-foreground">
          선택한 Wiki 관심사와 연결된 내용을 묶어 생성합니다.
        </p>
        <WikiInterestControl
          instanceId={instanceId}
          wikiInterests={wikiInterests}
          generation={generation}
        />
      </div>
    </section>
  );
}

function WikiInterestControl({
  instanceId,
  wikiInterests,
  generation,
}: {
  instanceId: string;
  wikiInterests: WikiInterestsState & { refetch: () => void };
  generation: DevelopmentReportGenerationState;
}) {
  if (wikiInterests.status === "loading") {
    return <div aria-hidden="true" className="mt-2.5 h-[32px] animate-pulse rounded-lg bg-[var(--skel1)]" />;
  }

  if (wikiInterests.status === "error") {
    return (
      <div role="alert" className="mt-2.5">
        <p className="text-[12px] leading-[1.55] text-ink-mid">Wiki 관심사를 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={wikiInterests.refetch}
          className="focus-ring mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-3 py-[7px] text-[12.5px] font-semibold text-ink-mid hover:bg-card"
        >
          다시 불러오기
        </button>
      </div>
    );
  }

  if (wikiInterests.status === "empty") {
    return (
      <p className="mt-2.5 text-[12px] leading-[1.55] text-muted-foreground">
        생성할 활성 Wiki 관심사가 없어요.
      </p>
    );
  }

  const selectId = `development-wiki-interest-${instanceId}`;
  return (
    <>
      <label htmlFor={selectId} className="sr-only">
        리포트로 생성할 Wiki 관심사
      </label>
      <select
        id={selectId}
        value={generation.wiki.selected?.tagId ?? ""}
        onChange={(event) => {
          const selected = wikiInterests.data.find((tag) => tag.tagId === event.target.value);
          if (selected) generation.wiki.select(selected);
        }}
        disabled={generation.wiki.submitting}
        className="focus-ring mt-2.5 w-full rounded-lg border border-input bg-background px-2.5 py-[7px] text-[12.5px] text-foreground disabled:opacity-50"
      >
        <option value="">Wiki 관심사 선택</option>
        {wikiInterests.data.map((tag) => (
          <option key={tag.tagId} value={tag.tagId}>
            {tag.tag}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={generation.wiki.submit}
        disabled={!generation.wiki.canSubmit}
        aria-busy={generation.wiki.submitting}
        className="focus-ring mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-3 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-ink-mid hover:bg-card disabled:opacity-50"
      >
        {generation.wiki.submitting ? "요청 중…" : "Wiki 관심사 리포트 즉시 생성"}
      </button>
      <ActionResult
        accepted={generation.wiki.accepted}
        success="Wiki 관심사 리포트 생성을 요청했어요."
        errorMessage={generation.wiki.errorMessage}
      />
    </>
  );
}

function ActionResult({
  accepted,
  success,
  errorMessage,
}: {
  accepted: boolean;
  success: string;
  errorMessage: string | null;
}) {
  if (accepted) {
    return (
      <p role="status" className="mt-2 text-[12px] leading-[1.55] text-signal-ink">
        {success}
      </p>
    );
  }
  if (errorMessage !== null) {
    return (
      <p role="alert" className="mt-2 text-[12px] leading-[1.55] text-ink-mid">
        {errorMessage}
      </p>
    );
  }
  return null;
}
