"use client";

import { Orb } from "@/components/brand/orb";
import type { MyReport, TrackableReportType } from "@/types/report";

/**
 * 홈 [내 보고서] 최상단 "처리중(PREPARING)" 슬롯 — 보고서 생성이 실제로 시작된 경우에만 노출한다.
 *
 * - 데이터는 상위(HomeView)가 useMyReportJobs 로 한 번 조회해 status 별로 나눈 preparing 배열을 prop 으로 받는다
 *   (ERROR·READY 와 같은 조회를 중복하지 않기 위해 여기서 직접 fetch 하지 않는다).
 * - READY 카드(MemberFeed)·ERROR 카드(FailedReports)보다 항상 위에 온다.
 * - preparing 이 비어 있으면 아무것도 렌더하지 않는다 → 기존 카드 목록·Empty 그대로.
 * - 본문·상세 미연결(클릭·이동 없음), 가짜 진행률·카운트다운 없음. 처리중 여부는 status 로만 파생한다.
 */
export function PreparingReports({ reports }: { reports: MyReport[] }) {
  if (reports.length === 0) return null;

  return (
    <section aria-label="생성 중인 보고서" aria-live="polite" className="mb-4 flex flex-col gap-2.5">
      {reports.map((report) => (
        <PreparingSlot key={report.id} title={report.title} reportType={report.reportType} />
      ))}
    </section>
  );
}

/**
 * 카드 본문 제목 — 무엇을 생성하고 있는지 유형별로 다르게 알린다.
 * 온디맨드는 사용자가 고른 관심사명(title)을 그대로 문장에 넣어 "무엇을" 만드는지 드러내고,
 * 아침 브리핑은 사용자가 고른 값이 없으므로(LLM Wiki 가 상위 관심사로 자동 생성) 관심사명 대신
 * 고정 문구를 쓴다 — title 을 그대로 노출하면 서버가 채운 placeholder 가 새 나갈 수 있다.
 */
function preparingBodyTitle(title: string, reportType: TrackableReportType): string {
  if (reportType === "MORNING_BRIEFING") return "오늘의 아침 브리핑을 생성하고 있어요";
  return `${title} 보고서를 생성하고 있어요`;
}

/**
 * 하단 설명 — 유형과 무관하게 동일하다. 완료 시점을 약속하지 않고(§ 소요 시간 금지 규약과 동일 이유)
 * 완료 후 어디서 확인할 수 있는지만 안내한다.
 */
const PREPARING_DESCRIPTION = "완료되면 내 보고서에 바로 표시돼요.";

/**
 * 처리중 슬롯 1건 — READY 카드와 구분되되 오류/실패처럼 보이지 않게(브랜드 wash 배지 + 은은한 Orb).
 * Orb 회전은 motion-safe(감속 모션 존중), 링크·버튼 없음(상세 이동 없음).
 *
 * 정보 위계(2026-08-11 개선): 관심사명과 "생성 중" 상태가 한 줄에 뭉쳐 있으면 무엇을 만드는지와
 * 지금 상태의 구분이 약했다. 상단은 상태 배지만, 본문 제목은 무엇을 만드는지(관심사명·아침 브리핑),
 * 하단은 완료 후 어디서 보이는지로 행을 나눈다. 색·애니메이션·카드 골격은 그대로 유지한다.
 */
function PreparingSlot({ title, reportType }: { title: string; reportType: TrackableReportType }) {
  return (
    <article className="rounded-[14px] border border-border bg-card px-[18px] py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          <Orb size={22} className="motion-safe:animate-spin [animation-duration:3s]" />
        </span>
        <div className="min-w-0">
          <span className="inline-block rounded-full border border-wash-strong bg-wash px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-signal-ink">
            생성 중
          </span>
          <p className="mt-1.5 truncate text-[14px] font-bold tracking-[-0.01em] text-foreground">
            {preparingBodyTitle(title, reportType)}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{PREPARING_DESCRIPTION}</p>
        </div>
      </div>
    </article>
  );
}
