"use client";

import { useRequireAuth } from "@/components/auth/use-require-auth";
import { useCardScrap } from "@/hooks/use-card-scrap";

/**
 * 카드 보관(스크랩) 토글 — 공개 피드 카드와 카드 상세가 함께 쓰는 단일 버튼.
 *
 * **PUBLIC 카드에서만** 렌더된다(노출 판정은 호출부). 백엔드가 스크랩 대상을 PUBLIC 으로 한정하므로
 * 비공개 카드에 두면 확실한 404 를 부른다. 좋아요와 같은 정책으로 **작성자 본인도 담을 수 있다** —
 * 본인 여부로 숨기거나 막지 않는다.
 *
 * 게스트 클릭은 requireAuth 가 GuestGateModal 로 가로챈다 → /scrap 요청이 나가지 않는다
 * (2026-08-07 실측: 토큰 없이 POST 하면 401 AUTH_INVALID_TOKEN → 저장 토큰 제거·인증 만료가 튄다).
 * 인증 복원 loading 중 클릭은 requireAuth 가 no-op 으로 삼킨다.
 *
 * 문구는 **기존 보관함 화면(`/scraps`)의 용어를 그대로** 쓴다: 메뉴·제목이 `북마크`, 액션이
 * `보관 해제`, 빈 상태가 `담아둔 보고서` 다. 같은 기능에 `스크랩` 이라는 세 번째 낱말을 새로
 * 들이지 않는다(API·타입 이름은 서버 계약이라 `scrap` 그대로 둔다 — 사용자 문구와 별개다).
 *
 * 상태를 **색으로만 전달하지 않는다**: 라벨 자체가 `보관` ↔ `보관 해제` 로 바뀌고 aria-pressed 가
 * 함께 붙는다. 목록에서는 카드가 여러 장이라 버튼 이름만으로 대상을 알 수 없어 제목을 sr-only 로
 * 덧댄다(같은 행의 `공유` 버튼과 같은 규율).
 */
export function CardScrapButton({
  publicId,
  initialScrapped,
  title,
  variant = "action",
}: {
  publicId: string;
  /** 검증된 서버 값만 온다 — `null`(알 수 없음)이면 호출부가 이 버튼을 렌더하지 않는다. */
  initialScrapped: boolean;
  /** 목록처럼 같은 이름의 버튼이 여러 개인 화면에서 대상을 밝히는 sr-only 보조 문구. */
  title?: string;
  /**
   * 놓이는 자리의 시각 토큰.
   * - `action`: 공개 피드 카드 하단 액션바(`.pact` — 테두리 없는 12.5px 칩)
   * - `bar`: 카드 상세 readbar(`.btn` — 32px 높이 테두리 버튼, `공유` 와 같은 줄)
   */
  variant?: "action" | "bar";
}) {
  const { requireAuth } = useRequireAuth();
  const { scrapped, busy, failed, toggle } = useCardScrap({ publicId, initialScrapped });

  // 실패해도 상태는 그대로라, 지금 값이 곧 "무엇을 하려다 실패했는지"다(훅이 따로 들고 다니지 않는다).
  const failureMessage = scrapped
    ? "보관을 해제하지 못했어요. 잠시 후 다시 시도해 주세요."
    : "보관하지 못했어요. 잠시 후 다시 시도해 주세요.";

  const base =
    variant === "bar"
      ? "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[12.5px] font-semibold whitespace-nowrap disabled:opacity-50"
      : "inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] disabled:opacity-50";
  const tone = scrapped
    ? "text-signal-ink"
    : variant === "bar"
      ? "text-ink-mid hover:bg-background"
      : "text-muted-foreground hover:bg-background hover:text-ink-mid";

  return (
    <>
      <button
        type="button"
        onClick={() => requireAuth(toggle)}
        disabled={busy}
        aria-pressed={scrapped}
        aria-busy={busy}
        className={`focus-ring ${base} ${tone}`}
      >
        <span aria-hidden="true">⚑</span>
        {scrapped ? "보관 해제" : "보관"}
        {title !== undefined && <span className="sr-only"> — {title}</span>}
      </button>

      {/*
        진행·실패 안내를 한 live region 으로 합친다(중복 안내 방지). busy 는 스크린리더에만 알리고
        (시각적으로는 버튼 disabled 로 충분), 실패는 눈에도 보이게 한다.
        서버 error.message 원문은 노출하지 않는다 — 화면 문구는 여기서만 고른다.
      */}
      <span
        role="status"
        aria-live="polite"
        className={`text-[11.5px] ${failed ? "text-ink-mid" : "sr-only"}`}
      >
        {busy ? "처리 중…" : failed ? failureMessage : ""}
      </span>
    </>
  );
}
