import type { NotificationType } from "@/types/notification";

/**
 * 알려진 알림 type 값 — 단일 소스(`lib/report-type.ts` 와 동일 규율).
 * `notification-row.tsx`(아이콘·라벨)와 `use-notification-navigation.ts`(이동 분기)가
 * 같은 상수를 공유해, 두 곳에 문자열 리터럴을 따로 박아두지 않는다.
 */
export const REPORT_READY_TYPE: NotificationType = "REPORT_READY";
export const FOLLOW_TYPE: NotificationType = "FOLLOW";
