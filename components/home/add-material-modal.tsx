"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

/**
 * 관심 자료 추가 모달 — 목업 #am-modal 1:1 (A4 시안).
 * 저장 = mock 수준(입력 리셋 + 닫기). 실제 저장 API는 계약 확정 후
 * lib/api-client 경유로 교체한다 (lib/mock/feed.ts 교체 지점 참조).
 * "저장하고 지금 분석 받기"는 목업대로 locked(무료 플랜 미제공).
 */
export function AddMaterialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState("");

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function close() {
    setValue("");
    onClose();
  }

  return (
    // .modal-bg — 배경 클릭 시 닫기
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(12,14,17,.45)]"
      onClick={close}
    >
      {/* .modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="관심 자료 추가"
        onClick={(e) => e.stopPropagation()}
        className="w-[460px] max-w-[calc(100%-48px)] rounded-2xl border border-border bg-card px-6 py-[22px] shadow-[0_24px_60px_rgba(10,12,15,.28)]"
      >
        {/* .mhead */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[16.5px] font-bold text-foreground">관심 자료 추가</span>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="rounded-[7px] px-[7px] py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground"
          >
            ✕
          </button>
        </div>
        {/* .ms */}
        <p className="mb-3.5 text-[13px] leading-[1.65] text-ink-mid">
          링크나 메모를 저장해 두면, AI가 나를 이해하고 브리핑을 고르는 데 활용해요.
        </p>

        <Input
          type="text"
          placeholder="링크(URL) 붙여넣기 또는 메모 입력"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="h-[46px] rounded-[10px] bg-card px-3.5 text-sm text-foreground placeholder:text-low focus-visible:ring-[3px] focus-visible:ring-wash dark:bg-card"
        />
        <div className="h-4" />

        {/* .amopt.on — 저장하기 (기본 선택, 유일한 선택지) */}
        <div className="mb-[9px] flex items-start gap-[11px] rounded-xl border border-primary bg-wash px-3.5 py-[13px]">
          {/* .amr (선택됨) */}
          <span className="relative mt-px h-4 w-4 shrink-0 rounded-full border-[1.5px] border-primary after:absolute after:inset-[3px] after:rounded-full after:bg-primary after:content-['']" />
          <div>
            <div className="text-[13.5px] font-bold text-foreground">저장하기</div>
            <div className="mt-[3px] text-xs leading-[1.55] text-muted-foreground">
              다음 아침 브리핑부터 반영돼요.
            </div>
          </div>
        </div>
        {/* .amopt.locked */}
        <div
          aria-disabled="true"
          title="무료 플랜에서는 제공되지 않아요"
          className="mb-[9px] flex cursor-not-allowed items-start gap-[11px] rounded-xl border border-border px-3.5 py-[13px] opacity-55"
        >
          <span className="relative mt-px h-4 w-4 shrink-0 rounded-full border-[1.5px] border-input" />
          <div>
            <div className="text-[13.5px] font-bold text-foreground">
              저장하고 지금 분석 받기
              <span className="ml-[7px] rounded-full border border-border bg-background px-2 py-0.5 align-[1px] text-[10.5px] font-semibold whitespace-nowrap text-muted-foreground">
                무료 플랜 미제공
              </span>
            </div>
            <div className="mt-[3px] text-xs leading-[1.55] text-muted-foreground">
              이 주제로 온디맨드 보고서를 바로 만들어드려요.
            </div>
          </div>
        </div>

        {/* .mfoot */}
        <div className="mt-[18px] flex justify-end gap-[9px]">
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-[15px] py-[9px] text-[13.5px] font-semibold whitespace-nowrap text-foreground hover:bg-background"
          >
            취소
          </button>
          {/* 저장 — mock: 닫기만 (실 API 연결 지점) */}
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-primary bg-primary px-[15px] py-[9px] text-[13.5px] font-semibold whitespace-nowrap text-primary-foreground hover:brightness-[.96]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
