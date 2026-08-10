import { apiGet, apiPost } from "@/lib/api-client";
import { clearAccessToken, setAccessToken } from "@/lib/token";
import type {
  ChangePasswordRequest,
  LoginData,
  LoginRequest,
  SignupData,
  SignupRequest,
  User,
} from "@/types/auth";

/**
 * 인증 API 계층 (CLAUDE.md §5).
 *
 * - 토큰 side-effect(저장/삭제)는 이 모듈에서만 발생한다.
 * - 엔드포인트 경로는 API 명세와 글자 그대로 1:1 (base=origin, `/api` 포함 전체 경로).
 */
const AUTH_ENDPOINTS = {
  login: "/api/auth/login",
  signup: "/api/auth/signup",
  me: "/api/auth/me",
  password: "/api/auth/password",
} as const;

/** 로그인 → 성공 시 accessToken 저장 후 LoginData(user 동봉) 반환. */
export async function login(req: LoginRequest): Promise<LoginData> {
  const data = await apiPost<LoginData>(AUTH_ENDPOINTS.login, req, { auth: false });
  setAccessToken(data.accessToken);
  return data;
}

/**
 * 회원가입 → 생성된 사용자 반환.
 * signup 응답에는 토큰이 없다(로그인 별도).
 * 확정 흐름(회원가입 화면에서 구현): 가입 성공 후 동일 자격증명으로 login() 자동 호출,
 * 자동 로그인이 실패한 경우에만 로그인 화면으로 유도한다.
 */
export async function signup(req: SignupRequest): Promise<SignupData> {
  return apiPost<SignupData>(AUTH_ENDPOINTS.signup, req, { auth: false });
}

/** 저장된 토큰으로 현재 사용자 조회 (새로고침·재진입 시 인증 복구용). */
export async function getMe(): Promise<User> {
  return apiGet<User>(AUTH_ENDPOINTS.me, { auth: true });
}

/**
 * 비밀번호 변경 (인증 필수). 성공 응답은 `data: null` 이라 돌려줄 값이 없다.
 *
 * **토큰 side-effect 가 없다** — stateless JWT 라 변경 후에도 기존 access token 이 만료까지
 * 그대로 유효하다(백엔드가 무효화 수단을 두지 않았다: AuthService.changePassword 주석 · 실측 확인).
 * 그래서 여기서 토큰을 지우거나 재로그인을 강제하지 않는다. 저장된 토큰을 지우면 서버는
 * 여전히 그 토큰을 받아주는데 사용자만 로그아웃되는, 근거 없는 로그아웃이 된다.
 */
export async function changePassword(req: ChangePasswordRequest): Promise<void> {
  await apiPost<null>(AUTH_ENDPOINTS.password, req);
}

/** 로그아웃 — 토큰 및 인증 상태 제거(§5). */
export function logout(): void {
  clearAccessToken();
}
