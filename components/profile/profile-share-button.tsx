"use client";

import { CopyToast } from "@/components/ui/copy-toast";
import { useCopyLink } from "@/hooks/use-copy-card-link";

/**
 * 프로필 공유 — 목업 hero 의 `↗ 공유` 자리다.
 *
 * 복사하는 링크는 **공개 프로필 URL** `{origin}/users/{publicId}` 하나다. `/profile` 은 보는 사람에
 * 따라 다른 화면이라(내 프로필 게이트) 공유 링크가 될 수 없다 — 본인 프로필에서 눌러도 남이 열 수
 * 있는 공개 주소를 준다.
 *
 * 동작·문구·토스트는 카드 공유와 **같은 시스템**을 쓴다(`useCopyLink` + `CopyToast`). 프로필용
 * 클립보드 로직을 따로 만들지 않는다. 서버 요청은 없다 — 읽기 동작이라 팔로우·공개 범위를
 * 건드리지 않는다.
 *
 * `navigator.share`(OS 공유 시트)는 여기 두지 않는다. 카드의 `⋯` 메뉴는 항목이 둘이라 팝오버가
 * 필요했지만, hero 는 링크 복사 하나뿐이라 버튼 한 개가 더 정직하고 짧다.
 */
export function ProfileShareButton({ publicId, name }: { publicId: string; name: string }) {
  const { copy, feedback } = useCopyLink(`/users/${encodeURIComponent(publicId)}`);

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="focus-ring inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[12.5px] font-semibold whitespace-nowrap text-ink-mid hover:bg-background"
      >
        <span aria-hidden="true">↗</span>
        공유
        <span className="sr-only"> — {name} 프로필 링크 복사</span>
      </button>

      {/* 낭독은 이 상시 live region 이 맡는다(토스트는 aria-hidden — CopyToast 주석 참조). */}
      <span role="status" aria-live="polite" className="sr-only">
        {feedback?.message ?? ""}
      </span>
      <CopyToast feedback={feedback} />
    </>
  );
}
