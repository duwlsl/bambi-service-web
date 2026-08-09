/**
 * 사용자 설정 타입 (bambi-service-api #63 · V17, 실측일 2026-08-09).
 *
 *   PATCH /api/users/me/settings  → 200 ApiResponse<UserSummary>   (인증 필수)
 *   조회는 전용 GET 이 없고 `GET /api/auth/me` 응답의 두 필드를 읽는다(types/auth.ts `User`).
 *
 * 계약 실측:
 * - **부분 수정이다.** 보낸 필드만 바뀌고 보내지 않은 필드는 그대로 유지된다
 *   (빈 바디 `{}` 도 200 · 무변경). 그래서 한 항목을 저장할 때 다른 항목을 함께 보내지 않는다 —
 *   화면이 들고 있던 낡은 값으로 서버 값을 덮어쓸 위험을 애초에 만들지 않는다.
 * - 응답은 변경된 **사용자 요약 전체**(UserSummary)라 저장 후 인증 상태를 그대로 갈아끼울 수 있다.
 * - `defaultCardVisibility` 허용값은 대문자 `PRIVATE`/`PUBLIC` 뿐이다. 소문자 `public` 도
 *   400 VALIDATION_ERROR (서버가 대소문자를 보정하지 않는다 — 실측).
 */

import type { CardVisibility } from "@/types/feed";

/** PATCH /api/users/me/settings 요청 body. 두 필드 모두 선택적(생략 = 미변경). */
export type UpdateUserSettingsRequest = {
  defaultCardVisibility?: CardVisibility;
  reportReadyNotification?: boolean;
};

/** 서버가 확정해 준 현재 설정값. 화면은 이 모양만 읽는다. */
export type UserSettings = {
  defaultCardVisibility: CardVisibility;
  reportReadyNotification: boolean;
};

/** 저장 단위(행) 식별자 — 어느 행이 저장 중·성공·실패인지 행별로 표시하기 위한 키. */
export type UserSettingsField = keyof UserSettings;
