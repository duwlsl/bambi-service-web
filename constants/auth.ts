/**
 * 인증 관련 상수.
 *
 * 토큰 localStorage key는 이 파일 1곳에서만 정의한다. (CLAUDE.md §5)
 * 저장·조회·삭제(로그아웃)는 모두 이 상수를 쓰는 인증 유틸을 경유하고,
 * 문자열 리터럴("bambi.accessToken")을 코드 곳곳에 흩뿌리지 않는다.
 */
export const ACCESS_TOKEN_STORAGE_KEY = "bambi.accessToken";
