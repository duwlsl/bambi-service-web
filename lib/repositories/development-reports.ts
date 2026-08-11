import { ERROR_CODES, FALLBACK_ERROR_CODE } from "@/constants/errors";
import { ApiError, apiPost } from "@/lib/api-client";
import type {
  GenerateReportResponse,
  GenerateWikiInterestReportRequest,
} from "@/types/generation";

/** 개발 서버의 실제 아침 리포트 생성 경로를 즉시 접수한다. */
export async function generateDevelopmentMorningReport(
  signal?: AbortSignal,
): Promise<GenerateReportResponse> {
  const path = "/api/dev/reports/generate/morning";
  const data = await apiPost<GenerateReportResponse | null>(path, undefined, { signal });
  return requireAccepted(data, path);
}

/** 선택한 현재 활성 Wiki 관심사로 실제 INTEREST_BUNDLE 생성을 즉시 접수한다. */
export async function generateDevelopmentWikiInterestReport(
  request: GenerateWikiInterestReportRequest,
  signal?: AbortSignal,
): Promise<GenerateReportResponse> {
  const path = "/api/dev/reports/generate/wiki-interest";
  const tagId = request.tagId.trim();
  if (tagId === "") {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, `blank tagId for ${path}`, 0);
  }
  const data = await apiPost<GenerateReportResponse | null>(path, { tagId }, { signal });
  return requireAccepted(data, path);
}

/** 접수 성공은 Service pending 식별자가 실제로 있을 때만 확정한다. */
function requireAccepted(
  data: GenerateReportResponse | null,
  path: string,
): GenerateReportResponse {
  if (!data || typeof data.id !== "string" || data.id.trim() === "") {
    throw new ApiError(FALLBACK_ERROR_CODE, `invalid generate payload for ${path}`, 202);
  }
  return data;
}
