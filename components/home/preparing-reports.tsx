"use client";

import { Orb } from "@/components/brand/orb";
import { usePreparingReports } from "@/hooks/use-preparing-reports";
import type { ReportKind } from "@/types/report";

/**
 * 홈 [내 보고서] 최상단 "처리중(PREPARING)" 슬롯 — 보고서 생성이 실제로 시작된 경우에만 노출한다.
 *
 * - 일반 자료 저장·기존 즉시 카드 흐름과 무관한 별도 데이터 경로(usePreparingReports)를 쓴다.
 * - READY 카드(MemberFeed)보다 항상 위에 온다.
 * - PREPARING 이 없으면(loading·empty·error 포함) 아무것도 렌더하지 않는다 → 기존 카드 목록·Empty 그대로.
 * - 본문·상세 미연결(클릭·이동 없음), 가짜 진행률·카운트다운 없음. 처리중 여부는 status 로만 파생한다.
 */
export function PreparingReports() {
  const state = usePreparingReports();
  // 슬롯은 PREPARING 이 1건 이상(success)일 때만 노출. loading/empty/error 는 미노출(슬롯 스켈레톤 없음).
  if (state.status !== "success") return null;

  return (
    <section aria-label="생성 중인 보고서" aria-live="polite" className="mb-4 flex flex-col gap-2.5">
      {state.data.map((report) => (
        <PreparingSlot key={report.id} title={report.title} kind={report.kind} />
      ))}
    </section>
  );
}

/** 유형별 하단 안내 — 온디맨드: 예상 소요 시간 / 데일리: 완료 후 확인 안내. */
const KIND_HINT: Record<ReportKind, string> = {
  ON_DEMAND: "예상 소요 시간 약 3~5분",
  DAILY: "완료 후 내 보고서에서 확인할 수 있어요",
};

/**
 * 처리중 슬롯 1건 — READY 카드와 구분되되 오류/실패처럼 보이지 않게(브랜드 wash 배지 + 은은한 Orb).
 * Orb 회전은 motion-safe(감속 모션 존중), 링크·버튼 없음(상세 이동 없음). 하단 안내는 생성 유형(kind)별로 다르다.
 */
function PreparingSlot({ title, kind }: { title: string; kind: ReportKind }) {
  return (
    <article className="rounded-[14px] border border-border bg-card px-[18px] py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          <Orb size={22} className="motion-safe:animate-spin [animation-duration:3s]" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 rounded-full border border-wash-strong bg-wash px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-signal-ink">
              분석 중
            </span>
            <span className="truncate text-[14px] font-bold tracking-[-0.01em] text-foreground">
              {title}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-mid">보고서를 생성하고 있어요.</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{KIND_HINT[kind]}</p>
        </div>
      </div>
    </article>
  );
}
