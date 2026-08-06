/**
 * 리포트 발행 완료 알림 Inbox API 타입.
 *
 * reportType: 아침 브리핑/온디맨드 구분("MORNING_BRIEFING"/"ON_DEMAND") — **현재 백엔드 응답에는
 * 이 필드가 없다**(service-api `NotificationResponse`·`Notification` 엔티티 실측, 2026-08-06).
 * 백엔드가 추가하면 즉시 표시되도록 optional로 미리 선언해 두되, 값이 없거나 알 수 없으면
 * 추측하지 않고 일반 라벨로 대체한다(lib/adapters/notifications.ts의 reportTypeLabel).
 */
export type NotificationDto = {
  id: number;
  type: string;
  title: string;
  body: string;
  targetPath: string;
  read: boolean;
  createdAt: string;
  reportType?: string | null;
};

export type NotificationListDto = {
  unreadCount: number;
  items: NotificationDto[];
};
