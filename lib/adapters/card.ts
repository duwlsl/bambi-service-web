import type { CardResponse, FeedCardVM } from "@/types/feed";

/**
 * CardResponse(API DTO) → FeedCardVM(화면 모델) 변환.
 * 백엔드가 준 필드만 옮기고, createdAt(ISO)만 표시용 문자열로 포맷한다.
 * 없는 값(작성자·좋아요·댓글 등)은 만들지 않는다. member 피드는 인증 확정 후 클라이언트에서만
 * 렌더되므로(SSR 없음) 로컬 타임존 포맷의 하이드레이션 불일치 위험은 없다.
 */
const CREATED_AT_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatCreatedAt(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return ""; // 파싱 실패 시 표시 생략(임의 값 생성 금지)
  return CREATED_AT_FORMAT.format(new Date(ts));
}

export function toFeedCardVM(card: CardResponse): FeedCardVM {
  return {
    publicId: card.publicId,
    title: card.title,
    summary: card.summary,
    whyForYou: card.whyForYou,
    sources: card.sources ?? [],
    createdAtLabel: formatCreatedAt(card.createdAt),
  };
}
