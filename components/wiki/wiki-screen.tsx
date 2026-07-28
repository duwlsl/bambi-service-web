"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { Orb } from "@/components/brand/orb";
import { AddMaterialModal } from "@/components/home/add-material-modal";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { HomeNav } from "@/components/home/home-nav";
import { SideLeft } from "@/components/home/side-left";
import { IconAlert } from "@/components/ui/state-icons";
import { PageState } from "@/components/ui/page-state";
import { WikiDocuments } from "@/components/wiki/wiki-documents";
import { WikiInterests } from "@/components/wiki/wiki-interests";
import { useWikiDocuments, type WikiDocumentsState } from "@/hooks/use-wiki-documents";
import { useWikiInterests, type WikiInterestsState } from "@/hooks/use-wiki-interests";
import { MOCK_SIDE_FOOT } from "@/lib/mock/feed";
import { filterWikiDocuments } from "@/lib/wiki";
import type { WikiInterest } from "@/types/wiki";

const WIKI_MENU_LABEL = "관심사 · LLM Wiki";

/**
 * 관심사 · LLM Wiki — member 전용 화면(§15 개인 데이터). 인증 상태 4분기로 진입을 제어한다.
 * - loading      → 중립 스켈레톤(개인 정보·guest CTA 노출 없음)
 * - error        → 인증 복원 오류 + 재시도
 * - guest        → 접근 제한 안내 + 로그인 CTA(개인 데이터 미노출)
 * - authenticated→ 본문(WikiView)
 */
export function WikiScreen() {
  const { status, refreshAuth } = useAuth();

  if (status === "loading") return <WikiSkeleton />;
  if (status === "error") return <WikiAuthError onRetry={refreshAuth} />;
  if (status === "guest") return <WikiAccessRestricted />;
  return <WikiView />;
}

/** 실제 본문 — authenticated 에서만 도달. 관심사 선택으로 하단 자료를 필터한다. */
function WikiView() {
  const interests = useWikiInterests();
  const documents = useWikiDocuments();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amOpen, setAmOpen] = useState(false);

  // 선택된 관심사(파생) — 목록에서 사라졌으면 필터 없음으로 자연 복귀한다.
  const selectedInterest: WikiInterest | null =
    interests.status === "success"
      ? (interests.data.find((i) => i.interestId === selectedId) ?? null)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <HomeNav onAddOpen={() => setAmOpen(true)} />

      <div className="mx-auto max-w-[1440px]">
        <div className="flex items-start justify-center gap-[22px] px-5 pt-6 pb-14">
          <SideLeft current={WIKI_MENU_LABEL} footLines={MOCK_SIDE_FOOT} />

          <main className="min-w-0 max-w-[760px] flex-1">
            <header className="mb-8">
              <h1 className="text-[22px] font-bold tracking-[-0.015em] text-foreground">
                관심사 · LLM Wiki
              </h1>
              <p className="mt-1 text-[13.5px] leading-[1.6] text-ink-mid">
                AI가 이해한 관심사와 그 근거가 된 자료를 확인해요.
              </p>
            </header>

            <WikiInterests
              state={interests}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
            />
            <WikiDocuments
              state={documents}
              selectedInterest={selectedInterest}
              onClearFilter={() => setSelectedId(null)}
            />
          </main>

          <WikiRail interests={interests} documents={documents} selectedInterest={selectedInterest} />
        </div>
      </div>

      {/* 저장 성공 시 관심사·자료를 재조회(§4 refetch 패턴). 후보 추가/무시·CRUD·Agent 직접 호출은 범위 밖. */}
      <AddMaterialModal
        open={amOpen}
        onClose={() => setAmOpen(false)}
        onSaved={() => {
          interests.refetch();
          documents.refetch();
        }}
      />
    </div>
  );
}

/** 우측 레일 — 파생 가능한 수치만 표시한다(활성/비활성 등 미제공 필드는 만들지 않는다). */
function WikiRail({
  interests,
  documents,
  selectedInterest,
}: {
  interests: WikiInterestsState;
  documents: WikiDocumentsState;
  selectedInterest: WikiInterest | null;
}) {
  const interestCount = interests.status === "success" ? interests.data.length : null;
  const visibleDocCount =
    documents.status === "success"
      ? filterWikiDocuments(documents.data, selectedInterest).length
      : null;

  return (
    <aside className="sticky top-4 flex w-[300px] shrink-0 flex-col gap-3.5 max-[1240px]:hidden">
      <div className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
        <h4 className="mb-[15px] text-[13px] font-bold text-foreground">Wiki 요약</h4>
        <RailStat label="파악한 관심사" value={interestCount} />
        <RailStat label={selectedInterest ? "이 관심사 자료" : "표시 중 자료"} value={visibleDocCount} />
      </div>
    </aside>
  );
}

function RailStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between border-t border-border py-2 text-[12.5px] text-ink-mid first:border-t-0 first:pt-px">
      <span>{label}</span>
      <b className="font-bold text-foreground">{value ?? "—"}</b>
    </div>
  );
}

/** 인증 복원 중 — 중립 스켈레톤(개인 정보·CTA 없음). HomeNav 는 loading 상태라 로고만 렌더한다. */
function WikiSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <HomeNav onAddOpen={() => {}} />
      <div className="mx-auto max-w-[1440px]">
        <div className="flex items-start justify-center gap-[22px] px-5 pt-6 pb-14">
          <main className="min-w-0 max-w-[760px] flex-1" aria-hidden="true">
            <FeedSkeleton />
          </main>
        </div>
      </div>
      <span className="sr-only" role="status">
        불러오는 중…
      </span>
    </div>
  );
}

/** 인증 복원 오류(500·네트워크) — 재시도 제공. member 화면을 대체 노출하지 않는다. */
function WikiAuthError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <HomeNav onAddOpen={() => {}} />
      <PageState
        role="alert"
        icon={<IconAlert />}
        title="인증 상태를 확인하지 못했어요"
        description="네트워크나 서버 상태를 확인한 뒤 다시 시도해 주세요."
        actions={[
          { label: "다시 시도", onClick: onRetry, variant: "primary" },
          { label: "홈으로", href: "/", variant: "ghost" },
        ]}
      />
    </div>
  );
}

/** guest 접근 — 개인 데이터라 본문 대신 접근 제한만 안내한다(§15). 로그인 경로 제공. */
function WikiAccessRestricted() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <HomeNav onAddOpen={() => {}} />
      <PageState
        role="alert"
        iconTone="brand"
        icon={<Orb size={22} />}
        title="로그인이 필요한 페이지예요"
        description="관심사 · LLM Wiki 는 로그인한 사용자만 볼 수 있어요."
        actions={[
          { label: "로그인", href: "/login", variant: "primary" },
          { label: "공개 홈으로", href: "/", variant: "ghost" },
        ]}
      />
    </div>
  );
}
