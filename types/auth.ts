/**
 * 인증 도메인 타입 (CLAUDE.md §3 실측 기반).
 * 백엔드: bambi-service-api /api/auth/*
 */

import type { CardVisibility } from "@/types/feed";

/** 사용자. 로그인/회원가입/`me` 응답에 공통으로 등장한다.
 * publicId·username·bio 는 07-31 백엔드 UserSummary 확장(#24) — 배포 전 응답과의
 * 호환을 위해 optional 로 둔다. publicId 는 내 프로필(/users/{publicId}) 진입에 쓴다.
 *
 * `defaultCardVisibility`·`reportReadyNotification` 은 08-09 백엔드 UserSummary 확장(#63, V17)이다.
 * **설정 화면의 현재값 조회 경로가 이 두 필드다** — 전용 `GET /api/users/me/settings` 는 없고
 * `GET /api/auth/me`(+로그인·가입 응답)가 함께 내려준다(2026-08-09 실측). 같은 이유로 optional 이며,
 * `undefined` 는 "false/PRIVATE" 가 아니라 **아직 알 수 없음**(구버전 응답)으로 다뤄야 한다. */
export type User = {
  id: number;
  email: string;
  displayName: string;
  roles: string[]; // 예: ["USER"] / ["ADMIN"]
  publicId?: string;
  username?: string | null;
  bio?: string | null;
  defaultCardVisibility?: CardVisibility;
  reportReadyNotification?: boolean;
  // 변경점(Delta) 추적 계정 설정 (08-10 백엔드 UserSummary 확장 #74, V19). 구버전 응답엔 없다.
  changeHistoryEnabled?: boolean;
};

/** POST /api/auth/login 성공 응답의 data. accessToken 은 data.accessToken 위치. */
export type LoginData = {
  accessToken: string;
  tokenType: string; // "Bearer"
  expiresInMinutes: number; // 예: 120 (2시간)
  user: User; // 로그인 응답에 user 동봉 → 직후 /api/auth/me 재호출 불필요
};

/** POST /api/auth/signup 성공 응답의 data. 토큰은 포함되지 않는다(로그인 별도). */
export type SignupData = User;

/** POST /api/auth/login 요청 body. */
export type LoginRequest = {
  email: string;
  password: string;
};

/** POST /api/auth/signup 요청 body. displayName 필수(실측 확정). */
export type SignupRequest = {
  email: string;
  password: string;
  displayName: string;
};

/**
 * POST /api/auth/password 요청 body (인증 필수, 2026-08-09 실측 · service-api #62).
 *
 * 확인용 재입력(`새 비밀번호 확인`)은 **서버 필드가 아니다** — 백엔드 DTO 가 두 필드뿐이라
 * 일치 검증은 프론트 몫이다(ChangePasswordRequest.java 주석에도 "confirm 은 프론트 검증").
 * `newPassword` 정책은 가입과 동일한 8~100자.
 */
export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};
