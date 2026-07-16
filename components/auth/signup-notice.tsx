"use client";

import { useSearchParams } from "next/navigation";

/**
 * 가입 완료 안내 — 가입 후 자동 로그인이 실패해 /login?signedUp=1 로 온 경우.
 * (가입 자체는 성공했으므로 재가입을 유도하지 않는다.)
 */
export function SignupNotice() {
  const params = useSearchParams();
  if (params.get("signedUp") !== "1") return null;

  return (
    <p
      role="status"
      className="mb-4 rounded-[10px] border border-primary/30 bg-wash px-3 py-2 text-left text-sm text-signal-ink"
    >
      가입은 완료됐어요. 로그인해 주세요.
    </p>
  );
}
