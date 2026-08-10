import { FALLBACK_ERROR_CODE } from "@/constants/errors";
import { ApiError, apiGet } from "@/lib/api-client";
import type { MyReport, ReportStatus, TrackableReportType } from "@/types/report";

/**
 * 내 보고서 생성 상태 repository — 화면 훅과 데이터 소스 사이의 단일 seam.
 *
 * Service의 생성 작업 상태를 화면 어휘(PREPARING/READY/ERROR)로 정규화한다.
 */
const REPORT_JOBS_PATH = "/api/reports/jobs";

type GenerationJobDto = {
  id: string;
  topic: string | null;
  reportType: string | null;
  status: string;
};

/** 로그인 사용자의 최근 생성 작업을 조회한다. */
export async function fetchMyReports(signal?: AbortSignal): Promise<MyReport[]> {
  const data = await apiGet<unknown>(REPORT_JOBS_PATH, { signal });
  if (!Array.isArray(data)) {
    throw new ApiError(FALLBACK_ERROR_CODE, `invalid report jobs payload for ${REPORT_JOBS_PATH}`, 200);
  }
  return data.map(toMyReport);
}

/** Service 작업 상태 한 건을 화면 모델로 변환한다. */
function toMyReport(value: unknown): MyReport {
  if (!isGenerationJobDto(value) || !isTrackableReportType(value.reportType)) {
    throw new ApiError(FALLBACK_ERROR_CODE, `invalid report job item for ${REPORT_JOBS_PATH}`, 200);
  }
  return {
    id: value.id,
    title: value.topic?.trim() || "관심사 보고서",
    reportType: value.reportType,
    status: toReportStatus(value.status),
  };
}

/** Agent·Publish 상태를 기존 화면 상태 어휘로 축약한다. */
function toReportStatus(status: string): ReportStatus {
  if (["PENDING", "RUNNING", "PUBLISHING"].includes(status)) return "PREPARING";
  if (status === "COMPLETED") return "READY";
  if (["FAILED", "CANCELLED"].includes(status)) return "ERROR";
  throw new ApiError(FALLBACK_ERROR_CODE, `unknown report job status: ${status}`, 200);
}

function isTrackableReportType(value: unknown): value is TrackableReportType {
  return value === "MORNING_BRIEFING" || value === "ON_DEMAND";
}

function isGenerationJobDto(value: unknown): value is GenerationJobDto {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (typeof item.topic === "string" || item.topic === null) &&
    (typeof item.reportType === "string" || item.reportType === null) &&
    typeof item.status === "string"
  );
}
