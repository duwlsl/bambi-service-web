"use client";

import { useState } from "react";
import Link from "next/link";

import { FxTriggerChart, LlmGrid, Us10yChart } from "@/components/home/mock-charts";
import type { FeedPost, TextSegment } from "@/lib/mock/feed";

/**
 * 피드 포스트 카드 — 목업 .post 1:1.
 * 보관(⚑)·좋아요(♡)는 mock 토글(로컬 state, 시각 상태만 변경 — 실제 저장 API는 계약 확정 후).
 * 제목·공유·⋯·댓글은 P0-4(상세)/P1 연결 전 → 시각 전용.
 */
export function PostCard({ post }: { post: FeedPost }) {
  const [saved, setSaved] = useState(post.saved);
  const [liked, setLiked] = useState(false);

  return (
    <article className="mb-4 rounded-[14px] border border-border bg-card px-[18px] pt-4 pb-[7px]">
      {/* .phead */}
      <div className="mb-1.5 flex items-center gap-2.5">
        <span
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
            post.author.isMe
              ? "border-wash-strong bg-wash text-signal-ink"
              : "border-input bg-background text-muted-foreground"
          }`}
        >
          {post.author.initials}
        </span>
        <div>
          <div className="text-sm font-bold text-foreground">
            {post.author.name}{" "}
            <span className="text-[13px] font-normal text-muted-foreground">
              {post.author.handleText}
            </span>
          </div>
          <div className="mt-px text-xs text-muted-foreground">{post.meta}</div>
        </div>
        {/* .pmore — P1 */}
        <span aria-hidden="true" className="ml-auto self-start px-1 text-lg leading-none text-muted-foreground">
          ⋯
        </span>
      </div>

      {/* .post>*:not(.phead){margin-left:48px} — 제목 클릭 → 카드 상세(P0-4) */}
      <h3 className="mb-2 ml-12 text-lg leading-[1.45] font-bold tracking-[-0.01em] text-foreground">
        <Link href={`/report/${post.id}`} className="hover:text-signal-ink">
          {post.title}
        </Link>
      </h3>
      <p className="mb-2.5 ml-12 text-sm leading-[1.7] text-ink-mid">
        {post.body}
        {post.showMore && <span className="font-semibold text-muted-foreground">더 보기</span>}
      </p>

      {post.media === "us10y" && post.imgcap && (
        <SingleImage caption={post.imgcap.caption} source={post.imgcap.source}>
          <Us10yChart />
        </SingleImage>
      )}
      {post.media === "fxTrigger" && post.imgcap && (
        <SingleImage caption={post.imgcap.caption} source={post.imgcap.source}>
          <FxTriggerChart />
        </SingleImage>
      )}
      {post.media === "llmGrid" && (
        // .pgrid
        <div className="mt-0.5 mb-3 ml-12 grid grid-cols-2 gap-[5px] overflow-hidden rounded-[11px] border border-border">
          <LlmGrid />
        </div>
      )}

      {/* .reason */}
      <div className="mb-3 ml-12 flex items-center gap-2 text-xs leading-[1.45] text-muted-foreground">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-primary" />
        <span>
          <Segments segments={post.reason} />
        </span>
      </div>

      {/* .pacts */}
      <div className="mt-1 ml-12 flex items-center gap-0.5 border-t border-border pt-1">
        {/* ⚑ 보관 — mock 토글 */}
        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          aria-pressed={saved}
          className={`inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] ${
            saved
              ? "text-signal-ink"
              : "text-muted-foreground hover:bg-background hover:text-ink-mid"
          }`}
        >
          ⚑ {saved ? <b className="font-semibold">보관됨</b> : "보관"}
        </button>

        {/* 댓글 — P1 시각 전용 */}
        <span className="inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] text-muted-foreground">
          <CommentIcon /> <b className="font-semibold text-ink-mid">{post.comments}</b>
        </span>

        {post.likes ? (
          <>
            {/* ♡ — mock 토글 */}
            <button
              type="button"
              onClick={() => setLiked((v) => !v)}
              aria-pressed={liked}
              className={`inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] ${
                liked
                  ? "text-signal-ink"
                  : "text-muted-foreground hover:bg-background hover:text-ink-mid"
              }`}
            >
              {liked ? "♥" : "♡"}{" "}
              <b className={`font-semibold ${liked ? "text-signal-ink" : "text-ink-mid"}`}>
                {post.likes}
              </b>
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] text-muted-foreground">
              조회 <b className="font-semibold text-ink-mid">{post.views}</b>
            </span>
            <span
              aria-disabled="true"
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] text-muted-foreground"
            >
              ↗ 공유
            </span>
          </>
        ) : (
          <>
            <span
              aria-disabled="true"
              className="inline-flex items-center gap-1.5 rounded-lg px-[11px] py-[9px] text-[12.5px] text-muted-foreground"
            >
              ↗ 공유
            </span>
            <span
              aria-hidden="true"
              className="ml-auto inline-flex items-center rounded-lg px-[11px] py-[9px] text-[12.5px] text-muted-foreground"
            >
              ⋯
            </span>
          </>
        )}
      </div>
    </article>
  );
}

function SingleImage({
  caption,
  source,
  children,
}: {
  caption: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    // .pimg
    <div className="mt-0.5 mb-3 ml-12 overflow-hidden rounded-[11px] border border-border bg-[var(--img)]">
      <span className="relative block h-[280px]">{children}</span>
      {/* .imgcap */}
      <div className="flex items-baseline gap-2 border-t border-border bg-background px-3 py-2 text-[11.5px] text-muted-foreground">
        <span className="flex-1 leading-[1.45]">{caption}</span>
        <span className="whitespace-nowrap text-ink-mid">{source}</span>
      </div>
    </div>
  );
}

export function Segments({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.bold ? (
          <b key={i} className="font-semibold text-ink-mid">
            {seg.text}
          </b>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

function CommentIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 fill-none stroke-current [stroke-width:1.6]"
    >
      <path
        d="M2.4 3.4h11.2c.6 0 1 .5 1 1v5.5c0 .6-.4 1-1 1H6.2L3.2 13.9v-2.9H2.4c-.6 0-1-.4-1-1V4.4c0-.5.4-1 1-1z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
