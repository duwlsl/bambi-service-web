"use client";

import type { FeedCardVM } from "@/types/feed";

/**
 * 실 피드 카드 — GET /api/feed / POST /api/bookmarks 의 CardResponse 기반(FeedCardVM).
 * 백엔드가 주는 값만 렌더한다: 생성시각 · 제목 · 요약 · 왜 나에게 왔나(whyForYou) · 출처.
 * 작성자·좋아요·댓글·태그·saved 는 백엔드가 주지 않으므로 만들지 않는다(공개 mock PostCard 와 별개).
 *
 * 제목은 비링크 텍스트다: 실 카드 publicId 는 UUID 라 카드 단건 API(GET /api/cards/{publicId})
 * 연동 전에는 /report/[id] 서버 존재검증(mock registry)을 통과하지 못해 404 가 된다 → 링크 걸지 않는다.
 * 공통 카드 스타일(border·radius·타이포·reason dot)은 PostCard 와 맞춘다.
 */
export function FeedCard({ card }: { card: FeedCardVM }) {
  return (
    <article className="mb-4 rounded-[14px] border border-border bg-card px-[18px] pt-4 pb-4">
      {card.createdAtLabel && (
        <div className="mb-2 text-xs text-muted-foreground">{card.createdAtLabel}</div>
      )}

      {/* 제목 — 비링크(카드 단건 API 전까지 죽은 링크 방지). */}
      <h3 className="mb-2 text-lg leading-[1.45] font-bold tracking-[-0.01em] text-foreground">
        {card.title}
      </h3>

      <p className="mb-3 text-sm leading-[1.7] text-ink-mid">{card.summary}</p>

      {/* 왜 나에게 왔나(whyForYou) — PostCard reason 라인과 동일 시각 언어. */}
      {card.whyForYou && (
        <div className="mb-3 flex items-start gap-2 text-xs leading-[1.5] text-muted-foreground">
          <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full bg-primary" />
          <span>{card.whyForYou}</span>
        </div>
      )}

      {/* 출처 — 실제 URL 이 있으면 외부 링크, 없으면 제목 텍스트. */}
      {card.sources.length > 0 && (
        <div className="border-t border-border pt-2.5">
          <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">
            출처 {card.sources.length}건
          </div>
          <ul className="flex flex-col gap-1.5">
            {card.sources.map((source, i) => {
              const label = source.title?.trim() || source.url;
              return (
                <li key={`${card.publicId}-src-${i}`} className="text-[13px] leading-[1.5]">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-signal-ink hover:underline"
                    >
                      {label} ↗
                    </a>
                  ) : (
                    <span className="text-ink-mid">{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
