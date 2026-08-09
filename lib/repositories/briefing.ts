import { FALLBACK_ERROR_CODE } from "@/constants/errors";
import { ApiError, apiGet, apiPut } from "@/lib/api-client";
import type { BriefingTopicsData } from "@/types/briefing";

/**
 * 아침 브리핑 주제 선택 repository — 화면 훅과 Service API 사이의 단일 seam.
 *
 * 실측 계약 (bambi-service-api `briefing/`, main 머지 `c230f7c`, 확인일 2026-08-09):
 * - GET /api/users/me/briefing-topics → `{ topics: string[] }` (미선택이면 `[]`, 404 아님)
 * - PUT /api/users/me/briefing-topics `{ topics: string[] }` → 정규화된 `{ topics: string[] }`
 *   · 전체 교체다. 빈 배열은 "선택 해제"로 정상 저장된다.
 *   · `topics` 필드 자체는 필수(@NotNull) — 빼먹으면 저장된 선택이 조용히 지워지지 않도록 서버가 막는다.
 *   · 정리(공백 제거·빈 항목 제외·중복 합침) **후** 개수를 세고, 3개 초과나 500자 초과면
 *     400 VALIDATION_ERROR. 이름이 현재 Wiki 관심사에 있는지는 서버가 검증하지 않는다.
 *
 * 인증 필수. Bearer 부착·envelope 해석·401 처리·error.code 정규화는 공통 api-client 가 한다(§3·§5·§8).
 * 훅이 authenticated 에서만 호출하므로 여기서 인증 상태를 다시 판단하지 않는다.
 */
const BRIEFING_TOPICS_PATH = "/api/users/me/briefing-topics";

/**
 * `topics` 컨테이너 검증 — **정상 빈 배열과 "응답이 깨짐"을 구분한다.**
 * 빈 배열은 미선택이라는 확정 정보라 그대로 통과시키고, 컨테이너 자체가 없으면 오류로 올린다
 * (여기서 `[]` 로 대체하면 조회 실패가 "선택 없음"으로 둔갑해 사용자 선택을 덮어쓴다).
 */
function requireTopics(data: BriefingTopicsData | null | undefined): string[] {
  if (!data || !Array.isArray(data.topics)) {
    throw new ApiError(FALLBACK_ERROR_CODE, `invalid topics payload for ${BRIEFING_TOPICS_PATH}`, 200);
  }
  return data.topics.filter((topic): topic is string => typeof topic === "string");
}

/** 저장된 주제 목록. 서버가 `position` 순으로 내려주며 그 순서를 그대로 유지한다. */
export async function fetchBriefingTopics(signal?: AbortSignal): Promise<string[]> {
  return requireTopics(await apiGet<BriefingTopicsData | null>(BRIEFING_TOPICS_PATH, { signal }));
}

/**
 * 주제 목록 전체 교체. 사용자가 고른 **순서 그대로** 보낸다.
 * 반환값은 서버가 정규화한 확정본이라, 호출부는 이 값으로 저장 상태를 갱신한다.
 */
export async function saveBriefingTopics(topics: string[], signal?: AbortSignal): Promise<string[]> {
  return requireTopics(
    await apiPut<BriefingTopicsData | null>(BRIEFING_TOPICS_PATH, { topics }, { signal }),
  );
}
