"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { Orb } from "@/components/brand/orb";
import { AddMaterialModal } from "@/components/home/add-material-modal";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { HomeNav } from "@/components/home/home-nav";
import { SideLeft } from "@/components/home/side-left";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { PageState } from "@/components/ui/page-state";
import { StateView } from "@/components/ui/state-view";
import {
  useWikiDocumentDetail,
  type WikiDocumentDetailState,
} from "@/hooks/use-wiki-document-detail";
import { useWikiGraph, type WikiGraphState } from "@/hooks/use-wiki-graph";
import { MOCK_SIDE_FOOT } from "@/lib/mock/feed";
import type {
  WikiDocumentDetail,
  WikiDocumentSource,
  WikiGraph,
  WikiGraphNode,
} from "@/types/wiki";

const WIKI_MENU_LABEL = "관심사 · LLM Wiki";
const GRAPH_WIDTH = 960;
const GRAPH_HEIGHT = 590;
const RING_SIZE = 14;

/** 인증 상태를 확인한 뒤 사용자용 LLM Wiki Graph 화면을 노출한다. */
export function LlmWikiScreen() {
  const { status, refreshAuth } = useAuth();

  if (status === "loading") return <LlmWikiSkeleton />;
  if (status === "error") return <LlmWikiAuthError onRetry={refreshAuth} />;
  if (status === "guest") return <LlmWikiAccessRestricted />;
  return <LlmWikiView />;
}

/** Graph·검색·선택 Node 상세를 한 화면에서 조합한다. */
function LlmWikiView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDocumentId = searchParams.get("document")?.trim() || null;
  const graph = useWikiGraph();
  const detail = useWikiDocumentDetail(selectedDocumentId);
  const [addOpen, setAddOpen] = useState(false);

  function selectDocument(documentId: string) {
    router.replace(`/wiki/graph?document=${encodeURIComponent(documentId)}`, { scroll: false });
  }

  function clearSelection() {
    router.replace("/wiki/graph", { scroll: false });
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeNav onAddOpen={() => setAddOpen(true)} />
      <div className="mx-auto max-w-[1440px]">
        <div className="flex items-start justify-center gap-[22px] px-5 pt-6 pb-14">
          <SideLeft current={WIKI_MENU_LABEL} footLines={MOCK_SIDE_FOOT} />

          <main className="min-w-0 max-w-[1080px] flex-1">
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
                  저장한 자료에서 AI가 만든 Entity와 Concept의 연결입니다. 노드를 선택하면 생성 근거를
                  확인할 수 있어요.
                </p>
              </div>
              {graph.status === "success" && graph.data.wikiVersion !== null && (
                <span className="rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground">
                  Wiki v{graph.data.wikiVersion}
                </span>
              )}
            </header>

            <GraphContent
              state={graph}
              selectedDocumentId={selectedDocumentId}
              detail={detail}
              onSelect={selectDocument}
              onClearSelection={clearSelection}
            />
          </main>
        </div>
      </div>

      <AddMaterialModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={graph.refetch}
      />
    </div>
  );
}

function GraphContent({
  state,
  selectedDocumentId,
  detail,
  onSelect,
  onClearSelection,
}: {
  state: WikiGraphState & { refetch: () => void };
  selectedDocumentId: string | null;
  detail: WikiDocumentDetailState & { refetch: () => void };
  onSelect: (documentId: string) => void;
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
        className="min-h-[420px] rounded-[18px] border border-border bg-card"
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
        className="min-h-[420px] rounded-[18px] border border-border bg-card"
        icon={<IconEmptyDoc />}
        title="아직 만들어진 LLM Wiki가 없어요"
        description="관심 자료를 저장하면 AI가 Entity와 Concept을 정리해 연결해요."
        actions={[{ label: "관심사로 돌아가기", href: "/wiki", variant: "primary" }]}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <WikiGraphCanvas
        graph={state.data}
        selectedDocumentId={selectedDocumentId}
        onSelect={onSelect}
      />
      <WikiDetailPanel
        selectedDocumentId={selectedDocumentId}
        state={detail}
        onSelect={onSelect}
        onClear={onClearSelection}
      />
    </div>
  );
}

type PositionedNode = WikiGraphNode & { x: number; y: number };

/** 검색·종류 필터와 결정적 원형 배치를 적용한 SVG Graph. */
function WikiGraphCanvas({
  graph,
  selectedDocumentId,
  onSelect,
}: {
  graph: WikiGraph;
  selectedDocumentId: string | null;
  onSelect: (documentId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showEntity, setShowEntity] = useState(true);
  const [showConcept, setShowConcept] = useState(true);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");

  const visibleNodes = useMemo(
    () =>
      graph.nodes.filter((node) => {
        if (node.documentKind === "entity" && !showEntity) return false;
        if (node.documentKind === "concept" && !showConcept) return false;
        if (normalizedQuery === "") return true;
        return [node.title, node.summary ?? "", ...node.aliases]
          .join(" ")
          .toLocaleLowerCase("ko")
          .includes(normalizedQuery);
      }),
    [graph.nodes, normalizedQuery, showConcept, showEntity],
  );
  const positioned = useMemo(() => positionNodes(visibleNodes), [visibleNodes]);
  const positionById = useMemo(
    () => new Map(positioned.map((node) => [node.id, node])),
    [positioned],
  );
  const visibleEdges = graph.edges.filter(
    (edge) => positionById.has(edge.source) && positionById.has(edge.target),
  );

  return (
    <section className="overflow-hidden rounded-[18px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="sr-only">Wiki 노드 검색</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="노드 제목·요약 검색"
              className="focus-ring h-10 w-full rounded-[10px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </label>
          <GraphFilter
            label="Entity"
            checked={showEntity}
            tone="entity"
            onChange={setShowEntity}
          />
          <GraphFilter
            label="Concept"
            checked={showConcept}
            tone="concept"
            onChange={setShowConcept}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
          <span>노드 {visibleNodes.length}개</span>
          <span>연결 {visibleEdges.length}개</span>
          <span>전체 Entity {graph.stats.entityCount}개</span>
          <span>전체 Concept {graph.stats.conceptCount}개</span>
        </div>
      </div>

      {visibleNodes.length === 0 ? (
        <div className="flex min-h-[520px] items-center justify-center px-5 text-center text-[13px] text-muted-foreground">
          조건에 맞는 Wiki 노드가 없어요.
        </div>
      ) : (
        <div className="min-h-[520px] overflow-auto bg-[radial-gradient(circle_at_center,var(--wash)_0,transparent_62%)]">
          <svg
            viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
            className="h-auto min-h-[520px] w-full min-w-[620px]"
            role="img"
            aria-label={`LLM Wiki Graph, 노드 ${visibleNodes.length}개, 연결 ${visibleEdges.length}개`}
          >
            <g aria-hidden="true">
              {visibleEdges.map((edge) => {
                const source = positionById.get(edge.source);
                const target = positionById.get(edge.target);
                if (!source || !target) return null;
                const focused =
                  selectedDocumentId !== null &&
                  (edge.source === selectedDocumentId || edge.target === selectedDocumentId);
                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={focused ? "var(--primary)" : "var(--border)"}
                    strokeWidth={focused ? 2.5 : 1.4}
                    opacity={focused ? 0.78 : 0.7}
                  />
                );
              })}
            </g>
            <g>
              {positioned.map((node) => (
                <GraphNode
                  key={node.id}
                  node={node}
                  selected={node.id === selectedDocumentId}
                  onSelect={() => onSelect(node.id)}
                />
              ))}
            </g>
          </svg>
        </div>
      )}
    </section>
  );
}

function GraphFilter({
  label,
  checked,
  tone,
  onChange,
}: {
  label: string;
  checked: boolean;
  tone: "entity" | "concept";
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-ink-mid">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary"
      />
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${tone === "entity" ? "bg-primary" : "bg-signal-ink"}`}
      />
      {label}
    </label>
  );
}

function GraphNode({
  node,
  selected,
  onSelect,
}: {
  node: PositionedNode;
  selected: boolean;
  onSelect: () => void;
}) {
  const radius = Math.min(18, 9 + Math.sqrt(node.degree + 1) * 2.3);
  const label = node.title.length > 24 ? `${node.title.slice(0, 23)}…` : node.title;
  const fill = node.documentKind === "entity" ? "var(--primary)" : "var(--signal-ink)";

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${node.title}, ${node.documentKind}, 연결 ${node.degree}개`}
      transform={`translate(${node.x} ${node.y})`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="cursor-pointer outline-none"
    >
      <circle
        r={radius + (selected ? 6 : 0)}
        fill="transparent"
        stroke={selected ? "var(--ring)" : "transparent"}
        strokeWidth="3"
      />
      <circle r={radius} fill={fill} stroke="var(--card)" strokeWidth="3" />
      <text
        x={radius + 7}
        y="4"
        fill="var(--foreground)"
        fontSize="12"
        fontWeight={selected ? 750 : 620}
        paintOrder="stroke"
        stroke="var(--card)"
        strokeWidth="4"
        strokeLinejoin="round"
      >
        {label}
      </text>
      <title>{`${node.title} · ${node.documentKind} · 연결 ${node.degree}개`}</title>
    </g>
  );
}

/** 배열 순서만으로 재현 가능한 다중 원형 좌표를 계산한다. */
function positionNodes(nodes: WikiGraphNode[]): PositionedNode[] {
  if (nodes.length === 1) {
    return [{ ...nodes[0], x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 }];
  }
  return nodes.map((node, index) => {
    const ring = Math.floor(index / RING_SIZE);
    const ringStart = ring * RING_SIZE;
    const ringLength = Math.min(RING_SIZE, nodes.length - ringStart);
    const ringIndex = index - ringStart;
    const radius = Math.min(245, 135 + ring * 92);
    const angle = (ringIndex / Math.max(1, ringLength)) * Math.PI * 2 - Math.PI / 2;
    return {
      ...node,
      x: GRAPH_WIDTH / 2 + Math.cos(angle) * radius,
      y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radius,
    };
  });
}

function WikiDetailPanel({
  selectedDocumentId,
  state,
  onSelect,
  onClear,
}: {
  selectedDocumentId: string | null;
  state: WikiDocumentDetailState & { refetch: () => void };
  onSelect: (documentId: string) => void;
  onClear: () => void;
}) {
  return (
    <aside className="min-h-[520px] rounded-[18px] border border-border bg-card xl:sticky xl:top-4 xl:max-h-[calc(100dvh-32px)] xl:overflow-y-auto">
      {selectedDocumentId === null || state.status === "idle" ? (
        <DetailPlaceholder />
      ) : state.status === "loading" ? (
        <div className="p-5" aria-hidden="true">
          <FeedSkeleton />
        </div>
      ) : state.status === "error" ? (
        <StateView
          role="alert"
          className="min-h-[420px]"
          icon={<IconAlert />}
          title="노드 상세를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          actions={[{ label: "다시 시도", onClick: state.refetch, variant: "primary" }]}
        />
      ) : state.status === "notFound" ? (
        <StateView
          className="min-h-[420px]"
          icon={<IconEmptyDoc />}
          title="이 Wiki 노드를 찾을 수 없어요"
          description="삭제됐거나 더 이상 현재 Wiki에 포함되지 않은 노드예요."
          actions={[{ label: "선택 해제", onClick: onClear, variant: "ghost" }]}
        />
      ) : (
        <WikiDocumentDetailView document={state.document} onSelect={onSelect} onClear={onClear} />
      )}
    </aside>
  );
}

function DetailPlaceholder() {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center px-7 text-center">
      <div
        aria-hidden="true"
        className="mb-4 grid h-12 w-12 place-items-center rounded-[14px] border border-primary/20 bg-primary/10 text-xl text-primary"
      >
        ◇
      </div>
      <h2 className="text-[15px] font-bold text-foreground">Wiki 노드를 선택해 주세요</h2>
      <p className="mt-1.5 text-[12.5px] leading-[1.65] text-muted-foreground">
        AI가 정리한 내용과 연결 관계, 생성에 사용한 원본 자료를 볼 수 있어요.
      </p>
    </div>
  );
}

function WikiDocumentDetailView({
  document,
  onSelect,
  onClear,
}: {
  document: WikiDocumentDetail;
  onSelect: (documentId: string) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <KindBadge kind={document.documentKind} />
              <span className="text-[11px] text-muted-foreground">v{document.version}</span>
            </div>
            <h2 className="text-[18px] leading-[1.35] font-bold tracking-[-0.015em] text-foreground">
              {document.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="상세 닫기"
          >
            ×
          </button>
        </div>
        {document.summary !== null && (
          <p className="mt-2 text-[12.5px] leading-[1.65] text-ink-mid">{document.summary}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {document.domain !== null && <span>{document.domain}</span>}
          <span>출처 {document.sourceCount}개</span>
          <span>{document.filePath}</span>
        </div>
      </div>

      <div className="space-y-6 px-5 py-5">
        <section aria-labelledby="wiki-markdown-title">
          <h3 id="wiki-markdown-title" className="mb-2 text-[12px] font-bold text-foreground">
            Wiki 내용
          </h3>
          {document.markdown === "" ? (
            <p className="text-[12.5px] text-muted-foreground">정리된 본문이 아직 없어요.</p>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-[12px] border border-border bg-background p-3.5 font-sans text-[12px] leading-[1.75] text-ink-mid">
              {document.markdown}
            </pre>
          )}
        </section>

        <WikiSources sources={document.sources} />

        {document.relations.length > 0 && (
          <section aria-labelledby="wiki-relations-title">
            <h3 id="wiki-relations-title" className="mb-2 text-[12px] font-bold text-foreground">
              연결된 Wiki 노드
            </h3>
            <div className="flex flex-wrap gap-2">
              {document.relations.map((relation) => (
                <button
                  key={`${relation.direction}:${relation.relatedDocumentId}:${relation.relationType}`}
                  type="button"
                  onClick={() => onSelect(relation.relatedDocumentId)}
                  className="focus-ring rounded-full border border-border bg-background px-2.5 py-1 text-[11.5px] font-semibold text-ink-mid hover:border-primary/40 hover:text-foreground"
                >
                  {relation.relatedTitle}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: WikiGraphNode["documentKind"] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase ${
        kind === "entity"
          ? "bg-primary/10 text-primary"
          : "bg-signal-ink/10 text-signal-ink"
      }`}
    >
      {kind}
    </span>
  );
}

function WikiSources({ sources }: { sources: WikiDocumentSource[] }) {
  return (
    <section aria-labelledby="wiki-sources-title">
      <h3 id="wiki-sources-title" className="mb-2 text-[12px] font-bold text-foreground">
        이 노드를 만든 원본
      </h3>
      {sources.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">연결된 원본 자료가 없어요.</p>
      ) : (
        <ul className="space-y-2">
          {sources.map((source) => (
            <li
              key={source.sourceDocumentId}
              className="rounded-[11px] border border-border bg-background px-3 py-2.5"
            >
              <div className="mb-1 text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">
                {sourceTypeLabel(source.sourceType)}
              </div>
              {source.canonicalUrl !== null ? (
                <a
                  href={source.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring rounded-sm text-[12.5px] leading-[1.5] font-semibold text-foreground underline decoration-border underline-offset-3 hover:decoration-primary"
                >
                  {source.title}
                </a>
              ) : (
                <span className="text-[12.5px] leading-[1.5] font-semibold text-foreground">
                  {source.title}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function sourceTypeLabel(sourceType: string): string {
  if (sourceType === "onboarding_seed") return "온보딩 관심사";
  if (sourceType === "url") return "외부 URL";
  if (sourceType === "web_clipping") return "저장한 웹 자료";
  if (sourceType === "memo") return "내 메모";
  return "개인 자료";
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
