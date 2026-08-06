import type { NotificationVM } from "@/lib/adapters/notifications";

const REPORT_READY_TYPE = "REPORT_READY";

/**
 * 알림 행 — 헤더 드롭다운·독립 /notifications 화면이 공유한다.
 * 제목·본문은 항상 서버 값 그대로(§7 — 가짜 한국어 타입명 금지). 화살표는 이동 가능한 것으로
 * 확인된 타입(현재는 REPORT_READY 하나)에만 보이는 장식이고, 실제 이동 가능 여부는 클릭 시
 * resolver(lib/notifications/resolve-notification-target.ts)가 최종 판정한다.
 */
export function NotificationRow({
  notification,
  pending,
  onOpen,
}: {
  notification: NotificationVM;
  pending: boolean;
  onOpen: (notification: NotificationVM) => void;
}) {
  const navigable = notification.type === REPORT_READY_TYPE;
  const unread = !notification.read;

  return (
    <li className="list-none">
      <button
        type="button"
        disabled={pending}
        onClick={() => onOpen(notification)}
        className={`focus-ring flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-background disabled:cursor-wait disabled:opacity-60 ${
          unread ? "bg-wash/50" : "bg-card"
        }`}
      >
        <NotificationTypeIcon type={notification.type} />

        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-1.5">
            {unread && (
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            )}
            {unread && <span className="sr-only">읽지 않음, </span>}
            <span className="block truncate text-[13px] font-bold text-foreground">
              {notification.title}
            </span>
          </span>
          <span className="mt-0.5 block line-clamp-2 text-[12px] leading-5 text-muted-foreground">
            {notification.body}
          </span>
          <span className="mt-1 block text-[10.5px] text-muted-foreground">{notification.timeLabel}</span>
        </span>

        {navigable && (
          <span aria-hidden="true" className="mt-1.5 shrink-0 text-low">
            <ChevronRightIcon />
          </span>
        )}
      </button>
    </li>
  );
}

function NotificationTypeIcon({ type }: { type: string }) {
  if (type === REPORT_READY_TYPE) {
    return (
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-wash-strong bg-wash text-signal-ink"
      >
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="2.2" y="1.8" width="11.6" height="12.4" rx="1.8" />
          <path d="M5 6.4h6M5 9h4" strokeLinecap="round" />
          <path d="M5.4 11.6l1.3 1.3 2.6-2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  // 알 수 없는 타입 — generic bell 아이콘(§7). 가짜 타입명을 만들지 않고 아이콘만 중립으로 대체.
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
    >
      <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path
          d="M8 2c-1.6 0-2.8 1.3-2.8 2.9 0 2.8-1.1 4.1-1.9 4.8h9.4c-.8-.7-1.9-2-1.9-4.8C10.8 3.3 9.6 2 8 2z"
          strokeLinejoin="round"
        />
        <path d="M6.6 12.2a1.5 1.5 0 0 0 2.8 0" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M6 3.5l5 4.5-5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
