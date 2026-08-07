/** 로그인 후 이동은 현재 origin의 앱 경로만 허용해 open redirect를 막는다. */
export function safeReturnPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || value.length > 1500 || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  try {
    const parsed = new URL(value, "http://bambi.local");
    if (parsed.origin !== "http://bambi.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
