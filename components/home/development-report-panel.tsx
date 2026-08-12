"use client";

import type { DevelopmentReportGenerationState } from "@/hooks/use-development-report-generation";

/** 개발 서버에서 실제 아침 리포트 생성 경로를 실행하는 테스트 패널. */
export function DevelopmentReportPanel({
  generation,
  className,
}: {
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
    </section>
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
