import { FALLBACK_ERROR_CODE } from "@/constants/errors";
import { ApiError, apiGet } from "@/lib/api-client";
import { isGenerationPendingDto, REPORT_PENDING_PATH } from "@/lib/report-pending";
import type { GenerationPendingDto } from "@/types/report";

/**
 * 내 보고서 생성 상태 repository — 화면 훅과 데이터 소스 사이의 단일 seam.
 *
 * Service의 활성 생성 작업(PENDING/RUNNING/PUBLISHING) 계약만 조회한다.
 */
/** 로그인 사용자의 활성 생성 작업을 조회한다. */
export async function fetchPendingReports(signal?: AbortSignal): Promise<GenerationPendingDto[]> {
  const data = await apiGet<unknown>(REPORT_PENDING_PATH, { signal });
  if (!Array.isArray(data)) {
    throw new ApiError(
      FALLBACK_ERROR_CODE,
      `invalid report pending payload for ${REPORT_PENDING_PATH}`,
      200,
    );
  }
  if (!data.every(isGenerationPendingDto)) {
    throw new ApiError(
      FALLBACK_ERROR_CODE,
      `invalid report pending item for ${REPORT_PENDING_PATH}`,
      200,
    );
  }
  return data;
}
