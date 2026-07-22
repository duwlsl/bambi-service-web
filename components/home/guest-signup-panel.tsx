import Link from "next/link";

import { Orb } from "@/components/brand/orb";

/**
 * 비로그인 홈 우측 레일 — 로그인형 정보 패널(핵심 신호·추천 토픽) 대신 노출하는 compact 가입 유도 패널.
 * 목업 variants/home-feed-guest.html 의 auth card 재현: Orb · 제목 · 혜택 3개 · 가입하기(Primary) · 로그인.
 */
const BENEFITS = ["관심사 기반 아침 브리핑", "보고서 저장과 보관함", "댓글·공유 기능"];

export function GuestSignupPanel() {
  return (
    <aside className="sticky top-4 w-[300px] shrink-0 max-[1240px]:hidden">
      <div className="rounded-[14px] border border-border bg-card px-6 py-[30px] text-center">
        <div className="mx-auto mb-3.5 h-9 w-9">
          <Orb size={36} />
        </div>
        <h4 className="text-[18px] font-bold tracking-[-0.01em] text-foreground">
          나만의 신호를 받아보세요
        </h4>
        <p className="mt-2 text-[12.5px] leading-[1.6] text-ink-mid">가입하면 이런 걸 쓸 수 있어요.</p>

        <ul className="mt-4 mb-5 flex flex-col gap-[9px] text-left">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-[9px] text-[12.5px] text-ink-mid">
              <CheckIcon />
              {b}
            </li>
          ))}
        </ul>

        <Link
          href="/signup"
          className="flex h-12 w-full items-center justify-center rounded-[10px] border border-primary bg-primary text-[14.5px] font-semibold text-primary-foreground hover:brightness-[.96]"
        >
          가입하기
        </Link>
        <Link
          href="/login"
          className="mt-2.5 flex h-12 w-full items-center justify-center rounded-[10px] border border-border bg-card text-[14.5px] font-semibold text-foreground hover:bg-background"
        >
          로그인
        </Link>
      </div>
    </aside>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 fill-none stroke-primary [stroke-width:2]"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}
