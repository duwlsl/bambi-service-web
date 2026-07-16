"use client";

import { useState } from "react";

import { AddMaterialModal } from "@/components/home/add-material-modal";
import { FeedMine } from "@/components/home/feed-mine";
import { FeedRec } from "@/components/home/feed-rec";
import { HomeNav } from "@/components/home/home-nav";
import { SideLeft } from "@/components/home/side-left";
import { SideRight } from "@/components/home/side-right";
import { MOCK_SIDE_FOOT } from "@/lib/mock/feed";

type HomeTab = "mine" | "rec";

/**
 * 홈 화면 — 목업 home-feed.html(피드 탭) / home-my-reports.html(내 보고서 탭) 1:1.
 * 하나의 화면에서 탭 전환(목업의 data-tab / data-feed hidden 방식과 동일하게
 * 두 패널을 유지한 채 hidden 토글 → 전환해도 카드 토글 상태 보존).
 */
export function HomeScreen() {
  const [tab, setTab] = useState<HomeTab>("rec"); // 목업 home-feed 기본: 피드
  const [amOpen, setAmOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* nav — 풀블리드(배경·보더 전체 폭), 내부는 1440 정렬 (HomeNav 내부에서 처리) */}
      <HomeNav onAddOpen={() => setAmOpen(true)} />

      {/* .app — 콘텐츠 영역만 1440 중앙 정렬 */}
      <div className="mx-auto max-w-[1440px]">
        {/* .shell */}
        <div className="flex items-start justify-center gap-[22px] px-5 pt-6 pb-14">
          <SideLeft current="홈" footLines={MOCK_SIDE_FOOT} />

          {/* .feed */}
          <main className="min-w-0 max-w-[760px] flex-1">
            {/* .tabs */}
            <div
              role="tablist"
              aria-label="홈 피드 전환"
              className="sticky top-4 z-20 mb-4 flex overflow-hidden rounded-[14px] border border-border bg-card"
            >
              <TabButton id="mine" active={tab === "mine"} onSelect={() => setTab("mine")}>
                내 보고서
              </TabButton>
              <TabButton id="rec" active={tab === "rec"} onSelect={() => setTab("rec")}>
                피드
              </TabButton>
            </div>

            <div role="tabpanel" id="panel-rec" aria-labelledby="tab-rec" hidden={tab !== "rec"}>
              <FeedRec />
            </div>
            <div role="tabpanel" id="panel-mine" aria-labelledby="tab-mine" hidden={tab !== "mine"}>
              <FeedMine />
            </div>
          </main>

          <SideRight />
        </div>
      </div>

      <AddMaterialModal open={amOpen} onClose={() => setAmOpen(false)} />
    </div>
  );
}

/** .tab — 활성 시 .tl::after 언더라인(시그널 4px 라운드 바) */
function TabButton({
  id,
  active,
  onSelect,
  children,
}: {
  id: string;
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onSelect}
      className={`flex-1 text-center text-[14.5px] font-semibold ${
        active ? "text-foreground" : "text-muted-foreground hover:text-ink-mid"
      }`}
    >
      <span
        className={`relative inline-block py-[15px] ${
          active
            ? "after:absolute after:-right-[11px] after:bottom-0 after:-left-[11px] after:h-1 after:rounded-full after:bg-primary after:content-['']"
            : ""
        }`}
      >
        {children}
      </span>
    </button>
  );
}
