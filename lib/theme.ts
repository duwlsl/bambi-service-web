/**
 * 화면 모드(테마) — 라이트 / 다크 / 시스템. (설정 화면 §B)
 *
 * 저장소: localStorage(토큰과 동일 계층). CSS 는 globals.css 의 `.dark` 변수 + `@custom-variant dark`
 * 를 그대로 쓰며, documentElement 에 `.dark` 를 토글해 라이트/다크를 전환한다.
 * SSR-safe(window/document 가드). 잘못된 저장값은 안전한 기본값(system)으로 처리한다.
 */
export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "bambi.theme";
export const DEFAULT_THEME_MODE: ThemeMode = "system";

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

/** 저장된 테마 모드. 없거나 잘못된 값이면 기본값(system). */
export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(raw) ? raw : DEFAULT_THEME_MODE;
}

export function setStoredThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

/** system 을 실제 라이트/다크로 해석(OS 설정 기준). */
export function resolveThemeMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** documentElement 에 `.dark` 를 토글해 해석된 테마를 적용한다. */
export function applyResolvedTheme(resolved: "light" | "dark"): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}
