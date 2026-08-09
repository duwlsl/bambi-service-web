import { apiPatch } from "@/lib/api-client";
import type { CardResponse, CardVisibility } from "@/types/feed";

/**
 * 카드 도메인 repository — 공개 범위 변경. 화면 훅과 Service API 사이의 단일 seam이다.
 * 컴포넌트는 이 함수만 쓰고 `fetch`·api-client 를 직접 호출하지 않는다(CLAUDE.md §1).
 *
 * 실측 계약(service-api `card/`, 확인일 2026-08-05):
 *   PATCH /api/cards/{publicId}/visibility  body { visibility: "PUBLIC" | "PRIVATE" }
 *     → 200 ApiResponse<CardResponse>  (data.visibility 가 최종 확정값)
 *
 * 정책:
 * - **카드 소유자만** 변경 가능하다. 소유자가 아니거나 없는·삭제된 카드는 존재 노출 없이 404
 *   (`findByPublicIdAndUserIdAndDeletedAtIsNull` → NOT_FOUND).
 * - 허용값은 `PUBLIC` / `PRIVATE` 뿐이고, 그 외는 @Valid 단계에서 400 VALIDATION_ERROR 다.
 * - URL 에는 카드 `publicId` 만 쓴다(`reportId`·내부 순번 id 사용 금지).
 *
 * Bearer 부착·envelope 해석·401 처리는 공통 계층(`apiPatch` → `request`)이 그대로 담당한다.
 */
export function changeCardVisibility(
  cardPublicId: string,
  visibility: CardVisibility,
): Promise<CardResponse> {
  return apiPatch<CardResponse>(`/api/cards/${encodeURIComponent(cardPublicId)}/visibility`, {
    visibility,
  });
}
