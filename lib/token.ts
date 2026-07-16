import { ACCESS_TOKEN_STORAGE_KEY } from "@/constants/auth";

/**
 * JWT access token 저장소 접근 (CLAUDE.md §5).
 *
 * - 토큰 localStorage 접근은 이 모듈로 한정한다. 페이지·컴포넌트에서 직접 접근 금지.
 * - 서버(SSR)에서는 localStorage 가 없으므로 안전하게 no-op / null 처리한다.
 * - api-client(주입)와 auth(저장/삭제)가 함께 쓰며, 순환 참조를 피하려 별도 모듈로 둔다.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}
