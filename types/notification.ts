import type { ReportType } from "@/types/report";

/**
 * 알려진 알림 종류 — 백엔드 `NotificationResponse.type` 계약값과 1:1(2026-08-11 확인).
 * REPORT_READY(리포트 발행 완료), FOLLOW(팔로우 발생). 화면 아이콘·라벨 분기는
 * `lib/notifications/notification-type.ts` 한 곳에서만 하고, 여기에 프론트 전용 값을 새로 만들지 않는다.
 *
 * `NotificationDto.type` 자체는 아래처럼 이 union 이 아니라 `string` 으로 넓게 둔다 — 백엔드가
 * 계약에 없는 값을 보내도(신규 타입 추가·오배포 등) 런타임이 깨지지 않아야 하기 때문이다(§7).
 * 이 union 은 "알려진 값과 비교할 때" 타입 안전성을 얻기 위한 용도로만 쓴다.
 */
export type NotificationType = "REPORT_READY" | "FOLLOW";

/**
 * 리포트 발행 완료·팔로우 알림 Inbox API 타입.
 *
 * reportType: 보고서 생성 종류 — REPORT_READY 알림에서만 오고, 그 외 타입(FOLLOW 등)에는 없다.
 * 값이 없거나 알 수 없으면 추측하지 않고 일반 라벨로 대체한다(lib/adapters/notifications.ts 의
 * reportTypeLabel → lib/report-type.ts).
 *
 * 타입은 계약값(ReportType)으로 좁혀 두지만 런타임 판정은 문자열 무엇이 오든 안전하다
 * (매핑 함수가 unknown 을 받아 검증한다). 알림 목록에 종류 배지를 붙이는 것은 이번 범위가 아니다.
 */
export type NotificationDto = {
  id: number;
  type: string;
  title: string;
  body: string;
  targetPath: string;
  read: boolean;
  createdAt: string;
  reportType?: ReportType | null;
};

export type NotificationListDto = {
  unreadCount: number;
  items: NotificationDto[];
};
