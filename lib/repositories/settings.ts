import { FALLBACK_ERROR_CODE } from "@/constants/errors";
import { ApiError, apiPatch } from "@/lib/api-client";
import type { User } from "@/types/auth";
import type { UpdateUserSettingsRequest } from "@/types/settings";

/**
 * 사용자 설정 repository — 화면 훅과 Service API 사이의 단일 seam (CLAUDE.md §8).
 *
 * 실측 계약(service-api #63, 확인일 2026-08-09):
 *   PATCH /api/users/me/settings  body { defaultCardVisibility?, reportReadyNotification? }
 *     → 200 ApiResponse<UserSummary>   (인증 필수 · 부분 수정 · 응답이 갱신된 사용자 요약 전체)
 *     → 400 VALIDATION_ERROR           (공개범위가 PRIVATE/PUBLIC 이 아닐 때. 소문자도 400)
 *     → 401 AUTH_INVALID_TOKEN         (무토큰·만료·삭제된 사용자)
 *
 * **조회 함수를 두지 않는다.** 전용 GET 이 없고 현재값은 `GET /api/auth/me` 응답에 얹혀 오므로,
 * 설정 화면은 이미 떠 있는 인증 상태(`useAuth().user`)를 읽는다. 여기에 조회 함수를 만들면
 * 화면 진입마다 me 를 한 번 더 부르게 되고, 두 경로가 서로 다른 값을 들고 있을 수 있다.
 */

/**
 * 설정 부분 저장. **바꾼 항목만** 넘긴다 — 안 보낸 항목은 서버 값이 그대로 유지되므로
 * 화면이 들고 있던 값으로 다른 설정을 덮어쓸 수 없다(실측: 빈 바디 `{}` 도 200 무변경).
 *
 * 성공 응답의 `data` 는 갱신된 `UserSummary` 다. 공통 client 는 `success:true` 여도 data 가
 * null 일 수 있어(§3) 여기서 한 번 막는다 — 화면이 `null` 을 "설정 없음"으로 오해하지 않게.
 */
export async function updateUserSettings(req: UpdateUserSettingsRequest): Promise<User> {
  const path = "/api/users/me/settings";
  const data = await apiPatch<User | null>(path, req);
  if (data === null || data === undefined) {
    throw new ApiError(FALLBACK_ERROR_CODE, `missing data container for ${path}`, 200);
  }
  return data;
}
