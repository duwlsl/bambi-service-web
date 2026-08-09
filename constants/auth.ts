/**
 * 인증 관련 상수.
 *
 * 토큰 localStorage key는 이 파일 1곳에서만 정의한다. (CLAUDE.md §5)
 * 저장·조회·삭제(로그아웃)는 모두 이 상수를 쓰는 인증 유틸을 경유하고,
 * 문자열 리터럴("bambi.accessToken")을 코드 곳곳에 흩뿌리지 않는다.
 */
export const ACCESS_TOKEN_STORAGE_KEY = "bambi.accessToken";

/**
 * 비밀번호 정책 — 백엔드 @Size(min=8, max=100) 와 같은 값이다.
 * 가입(SignupRequest)과 비밀번호 변경(ChangePasswordRequest)이 **같은 정책**을 쓰므로
 * 두 화면이 각자 숫자를 들고 있다가 한쪽만 어긋나는 일이 없게 여기 1곳에 둔다.
 * 화면 검증은 서버 400(VALIDATION_ERROR)을 대신하는 게 아니라 먼저 걸러주는 용도다.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;
