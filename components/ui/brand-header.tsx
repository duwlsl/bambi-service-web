import Link from "next/link";

import { Orb } from "@/components/brand/orb";

/**
 * 최소 브랜드 헤더 — not-found / error 처럼 인증 컨텍스트에 의존하면 안 되거나(에러 원인이 컨텍스트일 수 있음)
 * 불필요한 최상위 안내 화면용. 로고만 노출하고 홈으로 이동한다(로그인 · 알림 등 상태 의존 UI 없음).
 */
export function BrandHeader() {
  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex h-[58px] max-w-[1440px] items-center px-6">
        <Link href="/" className="flex items-center gap-[9px]">
          <Orb size={26} />
          <span className="text-[17px] font-normal tracking-[.02em] text-foreground [font-family:Quicksand,sans-serif]">
            alphacatcher
          </span>
        </Link>
      </div>
    </nav>
  );
}
