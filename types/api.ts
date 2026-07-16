/**
 * Service API 공통 응답 포맷 (CLAUDE.md §3, 실측 확정).
 *
 *   성공: { success: true,  data: <T>,  error: null }
 *   실패: { success: false, data: null, error: { code, message } }
 *
 * HTTP status 만 보지 않고 success + error.code 를 함께 확인한다.
 * error.message 원문은 로깅용이며 사용자에게 그대로 노출하지 않는다.
 */
export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
};
