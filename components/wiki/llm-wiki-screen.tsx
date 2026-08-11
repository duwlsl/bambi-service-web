"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { Orb } from "@/components/brand/orb";
import { AddMaterialModal } from "@/components/home/add-material-modal";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { HomeNav } from "@/components/home/home-nav";
import { SideLeft } from "@/components/home/side-left";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { StateView } from "@/components/ui/state-view";
import { WikiDocumentPanel } from "@/components/wiki/wiki-document-panel";
import { WikiForceGraph } from "@/components/wiki/wiki-force-graph";
import { WikiResetConfirmModal } from "@/components/wiki/wiki-reset-confirm-modal";
import { useWikiDocumentDetail } from "@/hooks/use-wiki-document-detail";
import { useWikiBuildStatus, type WikiBuildStatusState } from "@/hooks/use-wiki-build-status";
import { useWikiGraph, type WikiGraphState } from "@/hooks/use-wiki-graph";
import { ERROR_CODES, resolveErrorMessage, type ErrorCode } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";
import { MOCK_SIDE_FOOT } from "@/lib/mock/feed";
import { resetWiki } from "@/lib/repositories/wiki";

const WIKI_MENU_LABEL = "관심사 · LLM Wiki";

/** 인증 상태를 확인한 뒤 사용자용 LLM Wiki Graph 화면을 노출한다. */
export function LlmWikiScreen() {
  const { status, refreshAuth } = useAuth();

  if (status === "loading") return <LlmWikiSkeleton />;
  if (status === "error") return <LlmWikiAuthError onRetry={refreshAuth} />;
  if (status === "guest") return <LlmWikiAccessRestricted />;
  return <LlmWikiView />;
}

/** URL을 바꾸지 않는 로컬 Node 선택 상태로 Graph와 문서 패널을 조합한다. */
function LlmWikiView() {
  const searchParams = useSearchParams();
  const initialDocumentId = searchParams.get("document")?.trim() || null;
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(initialDocumentId);
  const [detailRevealRequest, setDetailRevealRequest] = useState(0);
  const graph = useWikiGraph();
  const buildStatus = useWikiBuildStatus(graph.refetch);
  const detail = useWikiDocumentDetail(selectedDocumentId);
  const [addOpen, setAddOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<
    | {
        status: "success";
        deletedSourceDocumentCount: number;
        deletedSourceVersionCount: number;
      }
    | { status: "error"; errorCode: ErrorCode }
    | null
  >(null);
  const resetLock = useRef(false);
  const resetFeedbackRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (resetResult?.status === "success") resetFeedbackRef.current?.focus();
  }, [resetResult]);

  function selectDocument(
    documentId: string,
    options: { revealDetail?: boolean } = {},
  ) {
    setSelectedDocumentId(documentId);
    if (options.revealDetail) setDetailRevealRequest((request) => request + 1);
  }

  async function resetPersonalWiki() {
    if (resetLock.current || graph.status !== "success") return;
    resetLock.current = true;
    setResetting(true);
    setResetResult(null);
    try {
      const result = await resetWiki();
      setResetConfirmOpen(false);
      setSelectedDocumentId(null);
      setResetResult({
        status: "success",
        deletedSourceDocumentCount: result.deletedSourceDocumentCount,
        deletedSourceVersionCount: result.deletedSourceVersionCount,
      });
      graph.refetch();
      void buildStatus.refetch();
    } catch (error) {
      setResetConfirmOpen(false);
      setResetResult({
        status: "error",
        errorCode: error instanceof ApiError ? error.code : ERROR_CODES.INTERNAL_ERROR,
      });
    } finally {
      resetLock.current = false;
      setResetting(false);
    }
  }

  function refreshAfterMaterialSaved() {
    graph.refetch();
    void buildStatus.refetch();
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeNav onAddOpen={() => setAddOpen(true)} />
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col items-start justify-center gap-[22px] px-5 pt-6 pb-14 min-[1100px]:flex-row min-[1100px]:items-stretch">
          {/* desktop 에서는 좌측 내비+상세 레일, mobile 에서는 contents 로 상세만 main 다음 순서에 배치한다. */}
          <div className="contents min-[1100px]:flex min-[1100px]:w-[300px] min-[1100px]:shrink-0 min-[1100px]:flex-col">
            <SideLeft current={WIKI_MENU_LABEL} footLines={MOCK_SIDE_FOOT} sticky={false} />

            {graph.status === "success" && selectedDocumentId !== null && (
              <div className="order-2 w-full min-[1100px]:relative min-[1100px]:mt-4 min-[1100px]:h-0 min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:overflow-hidden">
                <WikiDocumentPanel
                  selectedDocumentId={selectedDocumentId}
                  revealRequest={detailRevealRequest}
                  state={detail}
                  onSelect={selectDocument}
                  onClear={() => setSelectedDocumentId(null)}
                />
              </div>
            )}
          </div>

          <main className="order-1 w-full min-w-0 max-w-[1080px] flex-1">
            <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link
                  href="/wiki"
                  className="focus-ring mb-2 inline-flex rounded-md text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  ← 관심사로 돌아가기
                </Link>
                <h1 className="text-[23px] font-bold tracking-[-0.02em] text-foreground">
                  나의 LLM Wiki
                </h1>
                <p className="mt-1 text-[13.5px] leading-[1.65] text-ink-mid">
                  노드를 움직이며 지식 연결을 탐색하고, 선택한 Wiki 문서와 생성 근거를 확인하세요.
                </p>
              </div>
              {graph.status === "success" && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {graph.data.wikiVersion !== null && (
                    <span className="rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground">
                      Wiki v{graph.data.wikiVersion}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={resetting}
                    onClick={() => {
                      setResetResult(null);
                      setResetConfirmOpen(true);
                    }}
                  >
                    {resetting ? "초기화 중…" : "Wiki 초기화"}
                  </Button>
                </div>
              )}
            </header>

            {resetResult && (
              <p
                ref={resetFeedbackRef}
                role={resetResult.status === "error" ? "alert" : "status"}
                aria-live={resetResult.status === "error" ? "assertive" : "polite"}
                aria-atomic="true"
                tabIndex={resetResult.status === "success" ? -1 : undefined}
                className={`mb-3 text-right text-[12px] ${
                  resetResult.status === "error" ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {resetResult.status === "error"
                  ? `Wiki를 초기화하지 못했어요. ${resolveErrorMessage(resetResult.errorCode)}`
                  : `원본 자료 ${resetResult.deletedSourceDocumentCount}개와 Version ${resetResult.deletedSourceVersionCount}개를 영구 삭제하고 Wiki를 초기화했어요.`}
              </p>
            )}

            <WikiBuildStatusBanner state={buildStatus} />

            <GraphContent
              state={graph}
              selectedDocumentId={selectedDocumentId}
              onSelect={selectDocument}
              onClearSelection={() => setSelectedDocumentId(null)}
            />
          </main>
        </div>
      </div>

      <AddMaterialModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={refreshAfterMaterialSaved}
      />
      <WikiResetConfirmModal
        open={resetConfirmOpen}
        pending={resetting}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => void resetPersonalWiki()}
      />
    </div>
  );
}

function WikiBuildStatusBanner({ state }: { state: WikiBuildStatusState }) {
  if (state.status !== "ready") return null;

  if (state.data.status === "BUILDING") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mb-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-foreground"
      >
        <Orb size={22} className="shrink-0 motion-safe:animate-spin [animation-duration:3s]" />
        <div>
          <p className="text-[13.5px] font-semibold">LLM Wiki를 빌드하고 있어요</p>
          <p className="mt-0.5 text-[12px] leading-[1.55] text-muted-foreground">
            저장한 자료를 분석해 지식 연결을 업데이트하고 있어요. 완료되면 자동으로 반영돼요.
          </p>
        </div>
      </div>
    );
  }

  if (state.data.status === "FAILED") {
    return (
      <div
        role="alert"
        className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-foreground"
      >
        <IconAlert className="shrink-0 text-destructive" />
        <div>
          <p className="text-[13.5px] font-semibold">최근 LLM Wiki 빌드를 완료하지 못했어요</p>
          <p className="mt-0.5 text-[12px] leading-[1.55] text-muted-foreground">
            잠시 후 자료를 다시 저장하거나 페이지를 새로고침해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

function GraphContent({
  state,
  selectedDocumentId,
  onSelect,
  onClearSelection,
}: {
  state: WikiGraphState & { refetch: () => void };
  selectedDocumentId: string | null;
  onSelect: (documentId: string, options?: { revealDetail?: boolean }) => void;
  onClearSelection: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className="rounded-[18px] border border-border bg-card p-5" aria-hidden="true">
        <FeedSkeleton />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <StateView
        role="alert"
        className="min-h-[520px] rounded-[18px] border border-border bg-card"
        icon={<IconAlert />}
        title="LLM Wiki를 불러오지 못했어요"
        description="일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요."
        actions={[{ label: "다시 시도", onClick: state.refetch, variant: "primary" }]}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <StateView
        className="min-h-[520px] rounded-[18px] border border-border bg-card"
        icon={<IconEmptyDoc />}
        title="아직 만들어진 LLM Wiki가 없어요"
        description="관심 자료를 저장하면 AI가 Entity와 Concept을 정리해 연결해요."
        actions={[{ label: "관심사로 돌아가기", href: "/wiki", variant: "primary" }]}
      />
    );
  }

  return (
    <div className="relative min-h-[650px] overflow-hidden rounded-[18px] border border-border bg-card shadow-sm">
      <WikiForceGraph
        graph={state.data}
        selectedDocumentId={selectedDocumentId}
        onSelect={onSelect}
        onClear={onClearSelection}
      />
    </div>
  );
}

function LlmWikiSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <HomeNav onAddOpen={() => {}} />
      <main className="mx-auto max-w-[1080px] px-5 py-8" aria-hidden="true">
        <FeedSkeleton />
      </main>
    </div>
  );
}

function LlmWikiAuthError({ onRetry }: { onRetry: () => void }) {
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
          { label: "관심사로", href: "/wiki", variant: "ghost" },
        ]}
      />
    </div>
  );
}

function LlmWikiAccessRestricted() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <HomeNav onAddOpen={() => {}} />
      <PageState
        role="alert"
        iconTone="brand"
        icon={<Orb size={22} />}
        title="로그인이 필요한 페이지예요"
        description="LLM Wiki는 내 자료에서 만든 개인 지식 공간이에요. 로그인 후 확인해 주세요."
        actions={[
          { label: "로그인", href: "/login", variant: "primary" },
          { label: "홈으로", href: "/", variant: "ghost" },
        ]}
      />
    </div>
  );
}
