"use client";

import { useState } from "react";
import Link from "next/link";

import { AddMaterialModal } from "@/components/home/add-material-modal";
import { HomeNav } from "@/components/home/home-nav";
import { SideLeft } from "@/components/home/side-left";
import { Segments } from "@/components/home/post-card";
import { ReportBodyMock } from "@/components/report/report-body-mock";
import {
  MOCK_DETAIL_RAIL,
  MOCK_DETAIL_SIDE_FOOT,
  MOCK_MEMO,
  MOCK_REPORT,
  MOCK_SOURCES,
} from "@/lib/mock/report";

/**
 * 카드(리포트) 상세 — 목업 report-detail.html 1:1. 풀블리드(홈과 동일 패턴).
 * 실동작: 뒤로(홈 이동)·보관/공유 토글(로컬 state mock)·＋ 관심 자료 모달.
 * MD 복사·원문 열기·메모 입력·다음 항목·관련 브리핑은 P1/API 연결 전 → 시각 전용.
 */
export function ReportScreen() {
  const [saved, setSaved] = useState(MOCK_REPORT.savedInitially);
  const [shared, setShared] = useState(false);
  const [amOpen, setAmOpen] = useState(false);

  // readbar .btn.ghost.sm (+ .on 상태)
  const ghostBtn =
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-semibold whitespace-nowrap";
  const ghostOff = "border-border bg-transparent text-ink-mid hover:bg-background";
  const ghostOn = "border-wash-strong bg-wash text-signal-ink";

  return (
    <div className="min-h-screen bg-background">
      {/* nav — 풀블리드, 홈과 공유 */}
      <HomeNav onAddOpen={() => setAmOpen(true)} />

      <div className="mx-auto max-w-[1440px]">
        {/* .shell */}
        <div className="flex items-start justify-center gap-[22px] px-5 pt-6 pb-14">
          <SideLeft footLines={MOCK_DETAIL_SIDE_FOOT} />

          {/* .reader */}
          <main className="min-w-0 max-w-[760px] flex-1">
            {/* .readbar */}
            <div className="sticky top-4 z-20 mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-[9px] shadow-[var(--shadow)]">
              {/* 뒤로 — 홈으로 실제 이동 */}
              <Link
                href="/"
                className="flex items-center gap-2 text-[13.5px] font-semibold whitespace-nowrap text-ink-mid"
              >
                <span className="text-muted-foreground">←</span>
                {MOCK_REPORT.readbar.backLabel}
              </Link>
              <span className="flex-1" />
              {/* MD 복사 — DECISION-031 content_md 원문 복사, API 연결 전 시각 전용 */}
              <button
                type="button"
                aria-disabled="true"
                title="마크다운 원문 복사"
                className={`${ghostBtn} ${ghostOff}`}
              >
                {MOCK_REPORT.readbar.mdCopyLabel}
              </button>
              {/* 보관 — mock 토글 */}
              <button
                type="button"
                onClick={() => setSaved((v) => !v)}
                aria-pressed={saved}
                className={`${ghostBtn} ${saved ? ghostOn : ghostOff}`}
              >
                ⚑ {saved ? "보관됨" : "보관"}
              </button>
              {/* 공유 — mock 토글 (공유 모달 #sh-modal 공개 전환 플로우는 P1) */}
              <button
                type="button"
                onClick={() => setShared((v) => !v)}
                aria-pressed={shared}
                className={`${ghostBtn} ${shared ? ghostOn : ghostOff}`}
              >
                {MOCK_REPORT.readbar.shareLabel}
              </button>
            </div>

            {/* .dcard */}
            <article className="mb-4 rounded-2xl border border-border bg-card px-[30px] py-[26px]">
              {/* .dhead */}
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-wash-strong bg-wash text-[11px] font-bold text-signal-ink">
                  {MOCK_REPORT.head.avatar}
                </span>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {MOCK_REPORT.head.name}{" "}
                    <span className="text-[13px] font-normal text-muted-foreground">
                      {MOCK_REPORT.head.nameSub}
                    </span>
                  </div>
                  <div className="mt-px text-xs text-muted-foreground">{MOCK_REPORT.head.meta}</div>
                </div>
                {/* .dpill */}
                <span className="ml-auto rounded-full border border-border bg-background px-2.5 py-[3px] text-[11px] text-muted-foreground">
                  {MOCK_REPORT.head.pill}
                </span>
              </div>

              <h1 className="mb-3 text-[25px] leading-[1.38] font-bold tracking-[-0.015em] text-foreground">
                {MOCK_REPORT.title}
              </h1>
              <p className="mb-3.5 text-base leading-[1.66] text-ink-mid">{MOCK_REPORT.lead}</p>
              {/* .dmeta */}
              <div className="flex flex-wrap items-center gap-2.5 border-b border-border pb-4 text-[12.5px] text-muted-foreground">
                <span>
                  출처 <b className="font-semibold text-ink-mid">{MOCK_REPORT.meta.sourceCount}</b>
                </span>
                <span className="text-input">·</span>
                <span className="font-semibold text-ok">{MOCK_REPORT.meta.trust}</span>
                <span className="text-input">·</span>
                <span>
                  <Segments segments={MOCK_REPORT.meta.reason} />
                </span>
              </div>

              <ReportBodyMock />
            </article>

            {/* 출처 (.block) */}
            <section className="mb-4 rounded-2xl border border-border bg-card px-6 py-5">
              <div className="mb-3.5 flex items-center gap-[9px] text-[15px] font-bold text-foreground">
                출처{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  {MOCK_SOURCES.count}
                </span>
              </div>
              {MOCK_SOURCES.rows.map((row) => (
                <div
                  key={row.no}
                  className="mb-2 flex items-center gap-[11px] rounded-[10px] border border-border bg-card px-3.5 py-[11px] last:mb-0"
                >
                  <span className="w-[22px] shrink-0 text-[11.5px] text-muted-foreground">
                    {row.no}
                  </span>
                  {/* 신뢰도 dot */}
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      row.trust === "mid" ? "bg-[var(--mid)]" : "bg-[var(--ok-dot)]"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="text-[13.5px] font-semibold text-foreground">{row.name}</div>
                    <div className="mt-px text-[11.5px] text-muted-foreground">{row.pub}</div>
                  </div>
                  <span className="rounded-full border border-border px-[9px] py-0.5 text-[11px] whitespace-nowrap text-muted-foreground">
                    {row.type}
                  </span>
                  {/* 원문 열기 — 실제 URL 은 API 계약 확정 후 → 시각 전용 */}
                  <span
                    aria-disabled="true"
                    className="ml-auto text-xs font-semibold whitespace-nowrap text-signal-ink"
                  >
                    원문 열기 ↗
                  </span>
                </div>
              ))}
            </section>

            {/* 댓글 · 메모 (.block) */}
            <section className="mb-4 rounded-2xl border border-border bg-card px-6 py-5">
              <div className="mb-3.5 flex items-center gap-[9px] text-[15px] font-bold text-foreground">
                {MOCK_MEMO.blockTitle}{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  {MOCK_MEMO.blockSub}
                </span>
              </div>
              {/* .cmt */}
              <div className="flex items-start gap-2.5 border-b border-border py-3">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-input bg-background text-[9.5px] font-bold text-muted-foreground">
                  {MOCK_MEMO.memo.avatar}
                </span>
                <div>
                  <div className="text-[12.5px] font-bold text-foreground">
                    {MOCK_MEMO.memo.name}
                    <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">
                      {MOCK_MEMO.memo.time}
                    </span>
                  </div>
                  <p className="mt-[3px] text-[13px] leading-[1.6] text-ink-mid">
                    {MOCK_MEMO.memo.text}
                  </p>
                </div>
              </div>
              {/* .cinput — 메모 입력은 API 연결 전 시각 전용 (목업도 span) */}
              <div className="mt-3.5 flex items-center gap-2.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-wash-strong bg-wash text-[11px] font-bold text-signal-ink">
                  나
                </span>
                <span
                  aria-disabled="true"
                  className="flex h-[42px] flex-1 items-center rounded-[21px] border border-border bg-background px-4 text-[13px] text-muted-foreground"
                >
                  {MOCK_MEMO.inputPlaceholder}
                </span>
              </div>
              <p className="mt-2 pl-0.5 text-[11.5px] text-muted-foreground">{MOCK_MEMO.note}</p>
            </section>
          </main>

          {/* RIGHT RAIL (detail) */}
          <aside className="sticky top-4 flex w-[300px] shrink-0 flex-col gap-3.5 max-[1240px]:hidden">
            {/* 다음 항목 (.rnext) */}
            <div className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
              <h4 className="mb-[15px] flex items-center text-[13px] font-bold text-foreground">
                {MOCK_DETAIL_RAIL.next.title}
                <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                  {MOCK_DETAIL_RAIL.next.counter}
                </span>
              </h4>
              <RelatedRow title={MOCK_DETAIL_RAIL.next.item.title} meta={MOCK_DETAIL_RAIL.next.item.meta} first />
              <button
                type="button"
                aria-disabled="true"
                className="mt-[11px] inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-ink-mid"
              >
                {MOCK_DETAIL_RAIL.next.cta}
              </button>
            </div>

            {/* 출처 신뢰도 요약 */}
            <div className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
              <h4 className="mb-[15px] flex items-center text-[13px] font-bold text-foreground">
                {MOCK_DETAIL_RAIL.trust.title}
              </h4>
              {MOCK_DETAIL_RAIL.trust.rows.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between border-t border-border py-2 text-[12.5px] text-ink-mid ${i === 0 ? "border-t-0 pt-px" : ""}`}
                >
                  <span>{row.label}</span>
                  <b className={`font-bold ${row.ok ? "text-ok" : "text-foreground"}`}>{row.value}</b>
                </div>
              ))}
            </div>

            {/* 관련 브리핑 */}
            <div className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
              <h4 className="mb-[15px] flex items-center text-[13px] font-bold text-foreground">
                {MOCK_DETAIL_RAIL.related.title}
                <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                  {MOCK_DETAIL_RAIL.related.all}
                </span>
              </h4>
              {MOCK_DETAIL_RAIL.related.items.map((item, i) => (
                <RelatedRow key={item.title} title={item.title} meta={item.meta} first={i === 0} />
              ))}
            </div>
          </aside>
        </div>
      </div>

      <AddMaterialModal open={amOpen} onClose={() => setAmOpen(false)} />
    </div>
  );
}

/** .rrelated — API 연결 전 시각 전용 */
function RelatedRow({ title, meta, first }: { title: string; meta: string; first?: boolean }) {
  return (
    <div
      aria-disabled="true"
      className={`flex items-start gap-2.5 border-t border-border py-[9px] ${first ? "border-t-0 pt-px" : ""}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-[11px] text-muted-foreground">
        ◉
      </span>
      <div>
        <div className="text-[12.5px] leading-[1.4] font-semibold text-foreground">{title}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{meta}</div>
      </div>
    </div>
  );
}
