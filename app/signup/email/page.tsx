import type { Metadata } from "next";
import Link from "next/link";

import { AuthBack, AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { Orb } from "@/components/brand/orb";

export const metadata: Metadata = {
  title: "AlphaCatcher — 가입 — 이메일 입력",
  description: "이메일로 밤새비서 계정을 만들어 보세요.",
};

/**
 * 회원가입(이메일 폼) — 목업 product/auth-signup-email.html 1:1.
 * 뒤로 = 방식 선택(/signup)으로 실제 이동 (목업의 뷰 전환과 동일한 동작).
 * §7-1 확정에 따라 목업에 없는 이름(displayName) 필드를 동일 패턴으로 추가.
 */
export default function SignupEmailPage() {
  return (
    <AuthShell back={<AuthBack href="/signup" />}>
      {/* .auth-orb */}
      <div className="mx-auto mb-5 h-[46px] w-[46px]">
        <Orb size={46} />
      </div>
      {/* .auth-title */}
      <h1 className="mb-[9px] text-[25px] font-bold tracking-[-0.015em] text-foreground">
        계정 만들기
      </h1>
      {/* .auth-sub */}
      <p className="mb-7 text-sm leading-[1.65] text-muted-foreground">
        이메일과 비밀번호를 입력해 주세요.
      </p>

      <SignupForm />

      {/* .auth-terms — 약관 링크는 P1, 시각 전용 */}
      <p className="mt-3 text-[11.5px] leading-[1.7] text-muted-foreground">
        계속하면{" "}
        <a aria-disabled="true" className="cursor-pointer text-ink-mid underline underline-offset-2">
          이용약관
        </a>
        과{" "}
        <a aria-disabled="true" className="cursor-pointer text-ink-mid underline underline-offset-2">
          개인정보 처리방침
        </a>
        에 동의하게 돼요.
      </p>

      {/* .auth-switch */}
      <p className="mt-[22px] text-[13.5px] text-muted-foreground">
        이미 계정이 있으세요?
        <Link href="/login" className="ml-1.5 font-semibold text-signal-ink">
          로그인
        </Link>
      </p>
    </AuthShell>
  );
}
