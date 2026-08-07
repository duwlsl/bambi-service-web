import type { ThemeMode } from "@/lib/theme";

/**
 * 화면 테마 표기 — 본문 세그먼트(ThemeModeSegment)와 우측 rail 요약이 **같은 라벨**을 쓴다.
 * 문구를 두 곳에 따로 두면 한쪽만 바뀌어 같은 값이 다르게 보인다.
 */
export const THEME_MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
  { value: "system", label: "시스템" },
];

/** 현재 mode 의 표시 라벨. ThemeMode 는 세 값뿐이라 항상 찾아진다. */
export function themeModeLabel(mode: ThemeMode): string {
  return THEME_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? "";
}
