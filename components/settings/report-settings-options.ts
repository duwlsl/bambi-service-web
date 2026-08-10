import type { CardVisibility } from "@/types/feed";

/**
 * 보고서 설정 표기 — 본문 컨트롤(`ReportSettings`)과 우측 rail 요약이 **같은 라벨**을 쓴다.
 * 문구를 두 곳에 따로 두면 한쪽만 바뀌어 같은 값이 다르게 보인다(theme-modes.ts 와 같은 이유).
 *
 * 라벨은 목업 settings.html 의 공개 범위 세그먼트(`나만 보기` / `공개`)를 그대로 쓴다. 서버 값은
 * `PRIVATE`/`PUBLIC` 이지만 사용자에게 영문 enum 을 보여주지 않는다.
 */
export const REPORT_VISIBILITY_OPTIONS: { value: CardVisibility; label: string }[] = [
  { value: "PRIVATE", label: "나만 보기" },
  { value: "PUBLIC", label: "공개" },
];

/** 현재 공개 범위의 표시 라벨. CardVisibility 는 두 값뿐이라 항상 찾아진다. */
export function reportVisibilityLabel(visibility: CardVisibility): string {
  return REPORT_VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label ?? "";
}

/** 보고서 완료 알림 on/off 의 표시 라벨 — rail 요약이 쓴다. */
export function reportNotificationLabel(enabled: boolean): string {
  return enabled ? "받음" : "받지 않음";
}
