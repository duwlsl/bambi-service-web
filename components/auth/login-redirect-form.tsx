"use client";

import { useSearchParams } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { safeReturnPath } from "@/lib/safe-return-path";

export function LoginRedirectForm() {
  const searchParams = useSearchParams();
  return <LoginForm redirectTo={safeReturnPath(searchParams.get("returnTo"))} />;
}
