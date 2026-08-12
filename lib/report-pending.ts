import type {
  GenerationPendingDto,
  GenerationPendingStatus,
  TrackableReportType,
} from "@/types/report";

export const REPORT_PENDING_PATH = "/api/reports/pending";
export const ACTIVE_PENDING_POLL_MS = 5_000;
export const IDLE_PENDING_POLL_MS = 30_000;

/**
 * 서비스 기준 시간대. 사용자 시각 표기는 브라우저 로컬이 아니라 이 값으로 고정한다 —
 * 서버 렌더와 클라이언트 렌더가 같은 문자열을 만들어야 hydration 이 어긋나지 않는다.
 * 백엔드 생성 스케줄러도 같은 시간대로 돈다(service-api GenerationScheduler `zone = "Asia/Seoul"`).
 */
const SERVICE_TIME_ZONE = "Asia/Seoul";

export type PendingIdSnapshot = ReadonlySet<string> | null;

export type PendingSuccessObservation = {
  snapshot: ReadonlySet<string>;
  shouldRefreshFeed: boolean;
  nextIntervalMs: number | null;
};

export type PendingFailureObservation = {
  snapshot: PendingIdSnapshot;
  shouldRefreshFeed: false;
  nextIntervalMs: number | null;
};

/** 홈 처리중 슬롯에 노출할 유형별 제목. API 식별값이나 서버 placeholder는 노출하지 않는다. */
export function getPreparingReportTitle(title: string, reportType: TrackableReportType): string {
  if (reportType === "MORNING_BRIEFING") return "오늘의 아침 브리핑을 생성하고 있어요";
  if (reportType === "ONBOARDING") return "첫 리포트를 생성하고 있어요";
  if (reportType === "WIKI_INTEREST") return `${title} Wiki 관심사 보고서`;
  return `${title} 보고서`;
}

/**
 * 처리중 슬롯의 "언제 요청했는지" 표기 — `8월 11일 18:30 요청`.
 *
 * 접미사가 `생성` 이 아니라 **`요청`** 인 이유: 이 값은 생성이 **접수된** 시각이고 슬롯은 아직
 * 처리중 상태다. `…18:30 생성` 이라고 쓰면 그 시각에 보고서가 완성된 것처럼 읽힌다
 * (2026-08-12 브라우저 검수). 표시 문구만 바꾼 것이고 값·타임존 처리는 그대로다.
 *
 * **절대 시각만 쓴다.** `3분 전` 같은 상대 표기는 렌더 시점(현재 시각)에 의존해 SSR 결과와
 * 클라이언트 결과가 달라지고, 5초마다 도는 polling 때마다 값이 흔들린다.
 *
 * **타임존을 `Asia/Seoul` 로 고정한다.** 서버는 `OffsetDateTime` 을 UTC ISO 문자열로 주고
 * (실측 `"2026-08-11T11:34:04.930071Z"`), 이 값을 실행 환경 기본 타임존으로 포맷하면 서버 렌더와
 * 브라우저 렌더가 서로 다른 문자열을 만들어 hydration 이 어긋난다. 서비스 기준 시간대(KST —
 * 백엔드 생성 스케줄러도 `Asia/Seoul` 로 돈다)를 명시해 어느 쪽에서 렌더해도 같은 값이 나온다.
 *
 * `hour12:false` 를 주는 이유: ko-KR 기본값은 `오후 06:30` 이라 요구 표기(`18:30`)와 다르다.
 *
 * 값이 없거나(`undefined`·`null`) 파싱되지 않으면 **빈 문자열**을 돌려주고 호출부가 줄 자체를
 * 그리지 않는다 — `Invalid Date` 노출도, 현재 시각으로의 대체도 하지 않는다
 * (`lib/adapters/card.ts` 의 기존 날짜 처리 규율과 동일).
 */
const PENDING_CREATED_DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SERVICE_TIME_ZONE,
  month: "long",
  day: "numeric",
});
const PENDING_CREATED_TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SERVICE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatPendingCreatedAt(iso: unknown): string {
  if (typeof iso !== "string") return "";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const at = new Date(ts);
  return `${PENDING_CREATED_DATE_FORMAT.format(at)} ${PENDING_CREATED_TIME_FORMAT.format(at)} 요청`;
}

/** 실제 Pending DTO의 필수 필드와 활성 상태 enum을 런타임에서 검증한다. */
export function isGenerationPendingDto(value: unknown): value is GenerationPendingDto {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.trim() !== "" &&
    isNullableString(item.topic) &&
    isNullableString(item.contentType) &&
    isTrackableReportType(item.reportType) &&
    isGenerationPendingStatus(item.status) &&
    typeof item.createdAt === "string" &&
    item.createdAt.trim() !== "" &&
    typeof item.updatedAt === "string" &&
    item.updatedAt.trim() !== "" &&
    isNullableString(item.errorCode)
  );
}

/** 성공 응답끼리만 비교한다. 동일 ID의 상태 변경은 완료가 아니며, ID 제거만 피드 갱신 신호다. */
export function observePendingSuccess(
  previous: PendingIdSnapshot,
  reports: readonly GenerationPendingDto[],
): PendingSuccessObservation {
  const snapshot = new Set(reports.map((report) => report.id));
  const shouldRefreshFeed =
    previous !== null && [...previous].some((pendingId) => !snapshot.has(pendingId));
  return {
    snapshot,
    shouldRefreshFeed,
    nextIntervalMs: reports.length > 0 ? ACTIVE_PENDING_POLL_MS : IDLE_PENDING_POLL_MS,
  };
}

/** 일시 오류는 빈 성공 응답이 아니다. 이전 스냅샷을 보존하고 활성 여부에 맞춰 재시도한다. */
export function observePendingFailure(previous: PendingIdSnapshot): PendingFailureObservation {
  return {
    snapshot: previous,
    shouldRefreshFeed: false,
    nextIntervalMs:
      previous !== null && previous.size > 0 ? ACTIVE_PENDING_POLL_MS : IDLE_PENDING_POLL_MS,
  };
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isTrackableReportType(value: unknown): value is TrackableReportType {
  return (
    value === "MORNING_BRIEFING" ||
    value === "ON_DEMAND" ||
    value === "ONBOARDING" ||
    value === "WIKI_INTEREST"
  );
}

function isGenerationPendingStatus(value: unknown): value is GenerationPendingStatus {
  return value === "PENDING" || value === "RUNNING" || value === "PUBLISHING";
}
