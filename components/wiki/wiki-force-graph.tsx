"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import type { WikiGraph, WikiGraphEdge, WikiGraphNode } from "@/types/wiki";

const GRAPH_WIDTH = 960;
const GRAPH_HEIGHT = 650;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const MIN_NODE_RADIUS = 10;
const MAX_NODE_RADIUS = 30;
/** 화면 맞춤에서 Node bounding box(중심 기준) 둘레에 남기는 여백. 기존 값 그대로다. */
const FIT_PADDING = 170;
/** 카드 하단 컨트롤 레이어(왼쪽 통계 · 오른쪽 Wiki 버튼)가 덮는 viewBox 높이. 맞춤에서 제외한다. */
const BOTTOM_CONTROL_ROOM = 70;

type Position = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
};

type ViewTransform = { x: number; y: number; scale: number };
type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};
type PanState = {
  pointerId: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const INITIAL_TRANSFORM: ViewTransform = { x: 0, y: 0, scale: 1 };

type NodeTone = "entity" | "concept";

/**
 * Node radial gradient 의 `<defs>` id. Graph 본체와 범례가 같은 정의를 각자의 `<svg>` 안에 두므로
 * (SVG 는 문서 전역 id 를 참조하지만, 범례는 Graph 가 없을 때도 그려야 한다) 접두사로 갈라 둔다.
 */
const NODE_GRADIENT_ID = {
  graph: { entity: "wiki-node-entity", concept: "wiki-node-concept" },
  legend: { entity: "wiki-legend-entity", concept: "wiki-legend-concept" },
} as const;

/*
  <b>포인터 → SVG 좌표 변환은 `getScreenCTM()` 하나로 한다(2026-08-13 검수).</b>

  예전에는 `getBoundingClientRect()` 로 `clientX * (960 / rect.width)` 처럼 직접 환산했는데,
  이는 **viewBox 가 요소를 꽉 채운다**고 가정한 계산이다. 요소 비율이 viewBox 비율(960:650)과
  다르면 기본값 `preserveAspectRatio="xMidYMid meet"` 가 남는 쪽에 여백(letterbox)을 만들어
  가정이 깨진다 — 3열에서 카드가 세로로 길어지자 드래그가 세로로 최대 ~94px 어긋났다.

  `getScreenCTM()` 은 좌표계→화면 행렬을 **실측**으로 돌려주므로 배율·중앙 정렬·letterbox 여백이
  자동으로 반영된다. 어느 요소에서 부르느냐로 좌표계를 고른다:
    - zoom·pan `<g>` → 행렬에 graph transform 까지 들어 있다. 그래서 호출부는 `transformRef` 를
      **다시 역산하지 않는다**(중복 적용 금지).
    - `<svg>` root → transform 적용 전 viewBox 좌표. wheel zoom 의 기준점이 이 좌표계다.
  행렬을 못 얻는 경우(레이아웃 전·display:none)에는 호출부가 기존 계산으로 안전하게 떨어진다.
*/
function toUserPoint(
  element: SVGGraphicsElement | null,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const ctm = element?.getScreenCTM() ?? null;
  if (ctm === null) return null;
  const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: point.x, y: point.y };
}

/** viewBox 좌표(graph transform 적용 전). wheel zoom 의 기준점. */
function viewBoxPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const exact = toUserPoint(svg, clientX, clientY);
  if (exact !== null) return exact;
  const rect = svg.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (GRAPH_WIDTH / rect.width),
    y: (clientY - rect.top) * (GRAPH_HEIGHT / rect.height),
  };
}

/** 화면 1px → viewBox 몇 단위인지. pan 이 화면 이동량을 viewBox 이동량으로 바꿀 때 쓴다. */
function viewUnitsPerPixel(svg: SVGSVGElement | null): number {
  const ctm = svg?.getScreenCTM() ?? null;
  if (ctm !== null && ctm.a !== 0) return 1 / ctm.a;
  const rect = svg?.getBoundingClientRect();
  return rect && rect.width > 0 ? GRAPH_WIDTH / rect.width : 1;
}

/** 조작 카드가 그래프 밖에서 부르는 Graph 동작. Graph 인스턴스가 마운트되며 직접 채운다. */
type GraphActions = { fit: () => void; reset: () => void };

/**
 * 검색·필터 상태 + 조작 함수 핸들. <b>조작 카드와 Graph 가 이걸 하나만 나눠 쓴다.</b>
 * 카드를 오른쪽 레일로 뺐다고 상태를 복제하면 필터가 두 벌이 되어 화면과 어긋난다 —
 * 상태는 이 훅 하나가 갖고, `fit`·`reset` 은 Graph 내부 좌표 ref 를 건드려야 하므로
 * Graph 가 자기 함수를 `actionsRef` 에 꽂아 준다(로직 이동·복제 없음).
 */
export type WikiGraphControls = {
  query: string;
  setQuery: (value: string) => void;
  showEntity: boolean;
  setShowEntity: (value: boolean) => void;
  showConcept: boolean;
  setShowConcept: (value: boolean) => void;
  showOrphan: boolean;
  setShowOrphan: (value: boolean) => void;
  actionsRef: { current: GraphActions | null };
};

export function useWikiGraphControls(): WikiGraphControls {
  const [query, setQuery] = useState("");
  const [showEntity, setShowEntity] = useState(true);
  const [showConcept, setShowConcept] = useState(true);
  const [showOrphan, setShowOrphan] = useState(true);
  const actionsRef = useRef<GraphActions | null>(null);
  return {
    query,
    setQuery,
    showEntity,
    setShowEntity,
    showConcept,
    setShowConcept,
    showOrphan,
    setShowOrphan,
    actionsRef,
  };
}

/** Agent Wiki와 같은 Force simulation·Node drag·화면 pan·wheel zoom Graph를 제공한다. */
export function WikiForceGraph({
  graph,
  controls,
  selectedDocumentId,
  onSelect,
  onClear,
  bottomRight,
}: {
  graph: WikiGraph;
  controls: WikiGraphControls;
  selectedDocumentId: string | null;
  onSelect: (documentId: string, options: { revealDetail: boolean }) => void;
  onClear: () => void;
  /** 카드 하단 오른쪽 컨트롤(Wiki 버전·초기화). 통계와 같은 행에 얹힌다. */
  bottomRight?: ReactNode;
}) {
  const { query, showEntity, showConcept, showOrphan, actionsRef } = controls;
  const [renderPositions, setRenderPositions] = useState<ReadonlyMap<string, Position>>(
    () => new Map(),
  );
  const [transform, setTransform] = useState<ViewTransform>(INITIAL_TRANSFORM);
  const svgRef = useRef<SVGSVGElement | null>(null);
  /** zoom·pan transform 이 걸린 `<g>`. 포인터 좌표 역변환의 기준 좌표계다. */
  const contentRef = useRef<SVGGElement | null>(null);
  const positionsRef = useRef(new Map<string, Position>());
  const transformRef = useRef<ViewTransform>(INITIAL_TRANSFORM);
  const frameRef = useRef<number | null>(null);
  const simulateRef = useRef<() => void>(() => {});
  const alphaRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);

  const visibleNodes = useMemo(
    () =>
      graph.nodes.filter((node) => {
        if (node.documentKind === "entity" && !showEntity) return false;
        if (node.documentKind === "concept" && !showConcept) return false;
        return showOrphan || node.degree > 0;
      }),
    [graph.nodes, showConcept, showEntity, showOrphan],
  );
  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );
  const maxGraphDegree = useMemo(
    () => Math.max(0, ...graph.nodes.map((node) => node.degree)),
    [graph.nodes],
  );
  const visibleEdges = useMemo(
    () =>
      graph.edges.filter(
        (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
      ),
    [graph.edges, visibleNodeIds],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const matchingNodeIds = useMemo(() => {
    if (normalizedQuery === "") return null;
    return new Set(
      visibleNodes
        .filter((node) =>
          [node.title, node.documentKey, node.subtype ?? "", node.summary ?? "", ...node.aliases]
            .join(" ")
            .toLocaleLowerCase("ko")
            .includes(normalizedQuery),
        )
        .map((node) => node.id),
    );
  }, [normalizedQuery, visibleNodes]);
  const neighborIds = useMemo(
    () => connectedNodeIds(selectedDocumentId, visibleEdges),
    [selectedDocumentId, visibleEdges],
  );

  useEffect(() => {
    seedPositions(positionsRef.current, visibleNodes);
    alphaRef.current = Math.max(alphaRef.current, 0.85);

    const simulate = () => {
      if (alphaRef.current < 0.012 || visibleNodes.length === 0) {
        frameRef.current = null;
        return;
      }
      simulateFrame(positionsRef.current, visibleNodes, visibleEdges, alphaRef.current);
      alphaRef.current *= 0.972;
      setRenderPositions(snapshotPositions(positionsRef.current));
      frameRef.current = requestAnimationFrame(simulate);
    };
    simulateRef.current = simulate;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(simulate);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [visibleEdges, visibleNodes]);

  function updateTransform(next: ViewTransform) {
    transformRef.current = next;
    setTransform(next);
  }

  useEffect(() => {
    const graphElement = svgRef.current;
    if (graphElement === null) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      // 기준점도 letterbox 를 반영해야 커서가 가리키는 지점을 중심으로 확대된다.
      const { x: mouseX, y: mouseY } = viewBoxPoint(
        graphElement,
        event.clientX,
        event.clientY,
      );
      const current = transformRef.current;
      const scale = clamp(
        current.scale * Math.exp(-event.deltaY * 0.0012),
        MIN_SCALE,
        MAX_SCALE,
      );
      const next = {
        x: mouseX - ((mouseX - current.x) / current.scale) * scale,
        y: mouseY - ((mouseY - current.y) / current.scale) * scale,
        scale,
      };
      transformRef.current = next;
      setTransform(next);
    };

    graphElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => graphElement.removeEventListener("wheel", handleWheel);
  }, [visibleNodes.length]);

  function reheat(alpha = 1) {
    alphaRef.current = Math.max(alphaRef.current, alpha);
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => simulateRef.current());
    }
  }

  function resetLayout() {
    positionsRef.current.clear();
    seedPositions(positionsRef.current, visibleNodes);
    setRenderPositions(snapshotPositions(positionsRef.current));
    reheat(1);
  }

  /**
   * 화면 맞춤 — 보이는 Node 의 bounding box 를 카드 안에 담는 배율·위치를 계산한다.
   * <b>사용자가 `화면 맞춤` 버튼을 눌렀을 때만 실행된다</b> — 최초 진입 시 자동으로 부르지 않는다
   * (첫 렌더 뒤 화면이 저절로 확대·이동하면 튀어 보인다).
   * 하단은 컨트롤 레이어(왼쪽 통계 · 오른쪽 Wiki 버튼)만큼 비워 두고 그 영역 안에서 중심을 잡아,
   * 맞춘 직후 노드·라벨이 컨트롤 뒤에 깔리지 않게 한다.
   */
  function fitGraph() {
    const points = visibleNodes
      .map((node) => positionsRef.current.get(node.id))
      .filter((point): point is Position => point !== undefined);
    if (points.length === 0) return;
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    /*
      하단 컨트롤이 덮는 띠를 **먼저 빼고** 남은 영역에 맞춘다 — 그래야 배율(scale)과 중심(y)이
      같은 영역을 기준으로 계산된다. 컨트롤 높이를 contentHeight 에 더하면 그건 graph 단위인데
      중심 보정은 viewBox 단위라 단위가 섞여, 여백만 커지고 노드는 작게 몰린다.
    */
    const usableHeight = GRAPH_HEIGHT - BOTTOM_CONTROL_ROOM;
    const contentWidth = Math.max(120, maxX - minX + FIT_PADDING);
    const contentHeight = Math.max(120, maxY - minY + FIT_PADDING);
    const scale = clamp(
      Math.min(GRAPH_WIDTH / contentWidth, usableHeight / contentHeight),
      MIN_SCALE,
      1.6,
    );
    updateTransform({
      x: GRAPH_WIDTH / 2 - ((minX + maxX) / 2) * scale,
      y: usableHeight / 2 - ((minY + maxY) / 2) * scale,
      scale,
    });
  }

  /** Node 좌표계(= 저장된 위치와 같은 단위). drag 가 쓴다. */
  function graphPoint(clientX: number, clientY: number): { x: number; y: number } {
    const exact = toUserPoint(contentRef.current, clientX, clientY);
    if (exact !== null) return exact;
    // CTM 을 못 얻을 때만 쓰는 근사(레이아웃 전 등). letterbox 는 반영되지 않는다.
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const viewX = (clientX - rect.left) * (GRAPH_WIDTH / rect.width);
    const viewY = (clientY - rect.top) * (GRAPH_HEIGHT / rect.height);
    const view = transformRef.current;
    return { x: (viewX - view.x) / view.scale, y: (viewY - view.y) / view.scale };
  }

  function startNodeDrag(event: ReactPointerEvent<SVGGElement>, nodeId: string) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = positionsRef.current.get(nodeId);
    if (!point) return;
    point.fixed = true;
    dragRef.current = {
      id: nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function startPan(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || closestNode(event.target)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const view = transformRef.current;
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: view.x,
      startY: view.y,
      moved: false,
    };
  }

  function movePointer(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      drag.moved =
        drag.moved ||
        Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3;
      if (!drag.moved) return;
      const point = positionsRef.current.get(drag.id);
      const cursor = graphPoint(event.clientX, event.clientY);
      if (point) {
        drag.moved = true;
        point.x = cursor.x;
        point.y = cursor.y;
        point.vx = 0;
        point.vy = 0;
        setRenderPositions(snapshotPositions(positionsRef.current));
        reheat(0.3);
      }
    }
    const pan = panRef.current;
    if (pan?.pointerId === event.pointerId) {
      // 화면 이동량 → viewBox 이동량. 가로·세로 배율이 같으므로(uniform) 한 계수로 충분하다.
      const unitsPerPixel = viewUnitsPerPixel(svgRef.current);
      const dx = (event.clientX - pan.x) * unitsPerPixel;
      const dy = (event.clientY - pan.y) * unitsPerPixel;
      pan.moved = pan.moved || Math.abs(dx) + Math.abs(dy) > 3;
      updateTransform({ ...transformRef.current, x: pan.startX + dx, y: pan.startY + dy });
    }
  }

  function endPointer(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      const point = positionsRef.current.get(drag.id);
      if (point) point.fixed = false;
      dragRef.current = null;
      if (drag.moved) reheat(0.25);
      onSelect(drag.id, { revealDetail: !drag.moved });
      return;
    }
    const pan = panRef.current;
    if (pan?.pointerId === event.pointerId) {
      panRef.current = null;
      if (!pan.moved) onClear();
    }
  }

  function cancelPointer() {
    const drag = dragRef.current;
    if (drag) {
      const point = positionsRef.current.get(drag.id);
      if (point) point.fixed = false;
    }
    dragRef.current = null;
    panRef.current = null;
  }

  /*
    조작 카드가 그래프 밖(오른쪽 레일)에 있으므로, 카드가 부를 함수를 여기서 꽂아 준다.
    `fitGraph`·`resetLayout` 은 이 컴포넌트의 `positionsRef`·`transformRef` 를 직접 다뤄야 해서
    밖으로 옮길 수 없다 — 대신 **같은 함수의 참조만** 넘긴다(구현 이동·복제 없음).
    의존성 배열을 두지 않아 매 렌더 최신 클로저로 갱신된다(값 두 개 대입이라 비용이 없다).
  */
  useEffect(() => {
    actionsRef.current = { fit: fitGraph, reset: resetLayout };
    return () => {
      actionsRef.current = null;
    };
  });

  return (
    <section className="h-full min-h-[650px] bg-card">
      {/*
        카드 하단 컨트롤 레이어 — 왼쪽 통계 · 오른쪽 Wiki 버튼이 **한 행**으로 읽힌다.
        SVG 아래 footer 가 아니라 그래프 위에 얹히는 레이어라 카드 높이가 늘지 않는다.
        가운데 빈 자리로 드래그가 막히지 않도록 컨테이너는 `pointer-events-none`, 두 그룹만 되살린다.
        좁은 폭에서는 `flex-wrap` 으로 두 줄이 되어 서로 겹치거나 카드 밖으로 나가지 않는다.
      */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="pointer-events-auto flex flex-wrap gap-2" aria-live="polite">
          <GraphStat value={visibleNodes.length} label="Nodes" />
          <GraphStat value={visibleEdges.length} label="Links" />
          <GraphStat
            value={visibleNodes.filter((node) => node.documentKind === "entity").length}
            label="Entities"
          />
          <GraphStat
            value={visibleNodes.filter((node) => node.documentKind === "concept").length}
            label="Concepts"
          />
        </div>
        {bottomRight !== undefined && (
          <div className="pointer-events-auto ml-auto flex flex-wrap items-center justify-end gap-2">
            {bottomRight}
          </div>
        )}
      </div>

      {visibleNodes.length === 0 ? (
        <div className="flex min-h-[650px] items-center justify-center px-5 text-center text-[13px] text-muted-foreground">
          선택한 종류에 해당하는 Wiki 노드가 없어요.
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          className="h-full min-h-[650px] w-full cursor-grab select-none active:cursor-grabbing"
          role="application"
          aria-label={`LLM Wiki Graph, 노드 ${visibleNodes.length}개, 연결 ${visibleEdges.length}개`}
          tabIndex={0}
          style={{ overscrollBehavior: "contain", touchAction: "none" }}
          onPointerDown={startPan}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={cancelPointer}
        >
          <defs>
            <NodeGradient id={NODE_GRADIENT_ID.graph.entity} tone="entity" />
            <NodeGradient id={NODE_GRADIENT_ID.graph.concept} tone="concept" />
          </defs>
          <rect width={GRAPH_WIDTH} height={GRAPH_HEIGHT} fill="var(--card)" />
          <g
            ref={contentRef}
            transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}
          >
            <g aria-hidden="true">
              {visibleEdges.map((edge) => (
                <ForceEdge
                  key={edge.id}
                  edge={edge}
                  positions={renderPositions}
                  selectedDocumentId={selectedDocumentId}
                  matchingNodeIds={matchingNodeIds}
                />
              ))}
            </g>
            <g>
              {visibleNodes.map((node, index) => (
                <ForceNode
                  key={node.id}
                  node={node}
                  position={
                    renderPositions.get(node.id) ?? initialPosition(node.id, index, visibleNodes.length)
                  }
                  selected={node.id === selectedDocumentId}
                  neighbor={neighborIds.has(node.id)}
                  mutedBySelection={selectedDocumentId !== null && !neighborIds.has(node.id)}
                  mutedBySearch={matchingNodeIds !== null && !matchingNodeIds.has(node.id)}
                  maxDegree={maxGraphDegree}
                  onPointerDown={(event) => startNodeDrag(event, node.id)}
                  onSelect={() => onSelect(node.id, { revealDetail: true })}
                />
              ))}
            </g>
          </g>
        </svg>
      )}
    </section>
  );
}

function ForceEdge({
  edge,
  positions,
  selectedDocumentId,
  matchingNodeIds,
}: {
  edge: WikiGraphEdge;
  positions: ReadonlyMap<string, Position>;
  selectedDocumentId: string | null;
  matchingNodeIds: ReadonlySet<string> | null;
}) {
  const source = positions.get(edge.source);
  const target = positions.get(edge.target);
  if (!source || !target) return null;
  const focused =
    selectedDocumentId !== null &&
    (edge.source === selectedDocumentId || edge.target === selectedDocumentId);
  const mutedBySelection = selectedDocumentId !== null && !focused;
  const mutedBySearch =
    matchingNodeIds !== null &&
    !matchingNodeIds.has(edge.source) &&
    !matchingNodeIds.has(edge.target);
  /*
    기본 Edge 는 `--border`(#E6E8EC) 였는데 흰 카드 위에서 거의 사라져 Node 관계를 읽을 수 없었다
    (2026-08-13 검수). 한 단계 진한 블루그레이 `--wiki-link` 로 올리고 두께도 1.25 → 1.5 로 세운다.
    선택 Edge 는 코랄 오렌지(`--wiki-related`) 2px. 라벨·Node 보다 세지 않도록 굵기는 여기서 멈춘다.
    가려진 Edge 도 완전히 숨기지 않는다 — 0.18 은 "있다는 건 보이되 읽히지는 않는" 값이다.
  */
  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke={focused ? "var(--wiki-related)" : "var(--wiki-link)"}
      strokeWidth={focused ? 2 : 1.5}
      opacity={mutedBySelection || mutedBySearch ? 0.18 : focused ? 0.95 : 0.8}
    />
  );
}

/**
 * Node 색 정의 — 중심에서 외곽으로 퍼지는 radial gradient.
 *
 * 단색 원은 작은 캔버스에서 답답하게 보이고 Node 가 겹칠 때 덩어리로 읽혔다(2026-08-13 검수).
 * 중심은 타입 색(Concept=코랄 오렌지 / Entity=스카이블루), 중간은 같은 계열의 옅은 색(`-soft`),
 * 외곽은 완전 투명이다. **계열을 늘리지 않고** globals.css 의 Wiki 토큰만 쓴다.
 *
 * gradient 반경은 objectBoundingBox 기준 50% = 원 반지름과 정확히 같다 — 시각 크기가 `r` 을 넘지
 * 않으므로 Node 가 가까워도 glow 가 번져 겹치지 않고, hit area(`r` 기준 원)와도 어긋나지 않는다.
 * blur 필터는 쓰지 않는다(Node 수만큼 필터가 쌓이면 pan/zoom 이 눈에 띄게 느려진다).
 */
function NodeGradient({ id, tone }: { id: string; tone: NodeTone }) {
  const core = tone === "entity" ? "var(--wiki-entity)" : "var(--wiki-concept)";
  const soft = tone === "entity" ? "var(--wiki-entity-soft)" : "var(--wiki-concept-soft)";
  return (
    <radialGradient id={id}>
      {/* 중심 70~85% → 작은 Node 도 중심은 또렷하다. 외곽 0 → 딱딱한 테두리가 생기지 않는다. */}
      <stop offset="0%" stopColor={core} stopOpacity={0.85} />
      <stop offset="35%" stopColor={core} stopOpacity={0.7} />
      <stop offset="65%" stopColor={soft} stopOpacity={0.45} />
      <stop offset="100%" stopColor={soft} stopOpacity={0} />
    </radialGradient>
  );
}

function ForceNode({
  node,
  position,
  selected,
  neighbor,
  mutedBySelection,
  mutedBySearch,
  maxDegree,
  onPointerDown,
  onSelect,
}: {
  node: WikiGraphNode;
  position: Position;
  selected: boolean;
  neighbor: boolean;
  mutedBySelection: boolean;
  mutedBySearch: boolean;
  maxDegree: number;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void;
  onSelect: () => void;
}) {
  const radius = nodeRadius(node.degree, maxDegree);
  const label = node.title.length > 28 ? `${node.title.slice(0, 27)}…` : node.title;
  const gradientId =
    node.documentKind === "entity" ? NODE_GRADIENT_ID.graph.entity : NODE_GRADIENT_ID.graph.concept;
  return (
    <g
      data-node-id={node.id}
      role="button"
      tabIndex={0}
      aria-label={`${node.title}, ${node.documentKind}, 연결 ${node.degree}개`}
      transform={`translate(${position.x} ${position.y})`}
      opacity={mutedBySelection || mutedBySearch ? 0.14 : 1}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="group cursor-pointer outline-none active:cursor-grabbing"
    >
      {/*
        바깥 원 = 상태 링 + hit area. gradient 외곽이 투명해지면 그 부분은 `visiblePainted` 기준으로
        집히지 않으므로, drag/click 범위가 줄지 않도록 이 원이 `pointer-events: all` 로 받아 준다.
        선택은 브랜드 주황 얇은 링(3px → 2px), 이웃은 코랄(`--wiki-related`), hover 는 옅은 회선 하나다 —
        크기는 어느 상태에서도 키우지 않는다(기존 selected 반경 +6 유지).
      */}
      <circle
        r={radius + (selected ? 6 : 3)}
        fill="transparent"
        pointerEvents="all"
        className={
          selected
            ? "stroke-primary"
            : neighbor
              ? "stroke-wiki-related"
              : "stroke-transparent group-hover:stroke-wiki-link"
        }
        strokeWidth={selected ? 2 : 1.5}
      />
      <circle r={radius} fill={`url(#${gradientId})`} />
      <text
        x={radius + 7}
        y="4"
        fill={selected ? "var(--foreground)" : "var(--ink-mid)"}
        fontSize="12"
        fontWeight={selected ? 760 : 620}
        paintOrder="stroke"
        stroke="var(--card)"
        strokeWidth="4"
        strokeLinejoin="round"
        pointerEvents="none"
      >
        {label}
      </text>
      <title>{`${node.title} · ${node.documentKind} · 연결 ${node.degree}개`}</title>
    </g>
  );
}

/**
 * 그래프 조작 카드 — 검색 · 타입 필터 · 화면 맞춤/다시 펼치기.
 *
 * 예전에는 그래프 카드 좌상단에 `absolute` 로 얹혀 있었는데, 카드 폭의 절반 가까이를 덮어
 * 그 아래 노드와 라벨을 가렸다(2026-08-13 검수). 그래프 밖 오른쪽 레일 상단으로 옮겨
 * **어떤 화면에서도 그래프 위를 덮지 않는다.** 상태는 `useWikiGraphControls` 하나뿐이고
 * 버튼은 그래프가 꽂아 준 함수를 그대로 호출한다.
 *
 * 카드 껍데기(테두리·라운드·그림자·패딩)는 그대로 두고, 겹침용이던 `bg-card/95`+`backdrop-blur`
 * 와 고정 폭만 걷어 레일 폭을 100% 쓰게 했다.
 */
export function WikiGraphControlPanel({ controls }: { controls: WikiGraphControls }) {
  const {
    query,
    setQuery,
    showEntity,
    setShowEntity,
    showConcept,
    setShowConcept,
    showOrphan,
    setShowOrphan,
    actionsRef,
  } = controls;
  return (
    <div className="w-full shrink-0 rounded-[14px] border border-border bg-card p-3.5 shadow-sm">
      <label>
        <span className="sr-only">Wiki 노드 검색</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="제목, 별칭, subtype 검색"
          className="focus-ring h-10 w-full rounded-[10px] border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <GraphFilter label="Entity" checked={showEntity} tone="entity" onChange={setShowEntity} />
        <GraphFilter label="Concept" checked={showConcept} tone="concept" onChange={setShowConcept} />
        <GraphFilter label="고립 Node" checked={showOrphan} onChange={setShowOrphan} />
      </div>
      {/* 좁은 레일에서도 버튼과 안내가 겹치지 않게 줄바꿈시킨다(안내는 남는 폭이 있을 때만 같은 줄). */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-border pt-3">
        <ToolbarButton label="화면 맞춤" onClick={() => actionsRef.current?.fit()} />
        <ToolbarButton label="다시 펼치기" onClick={() => actionsRef.current?.reset()} />
        <span className="ml-auto text-[10.5px] whitespace-nowrap text-muted-foreground">
          드래그 이동 · 휠 확대
        </span>
      </div>
    </div>
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
  tone?: NodeTone;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] font-semibold text-ink-mid">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary"
      />
      {tone && <LegendDot tone={tone} />}
      {label}
    </label>
  );
}

/**
 * 범례 점 — 실제 Node 와 **같은 gradient 를 축소해** 그린다.
 * 단색 점을 따로 두면 색은 맞춰도 형태가 달라 "이 점 = 저 Node" 가 한눈에 붙지 않는다.
 */
function LegendDot({ tone }: { tone: NodeTone }) {
  const id = NODE_GRADIENT_ID.legend[tone];
  return (
    <svg aria-hidden="true" viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0">
      <defs>
        <NodeGradient id={id} tone={tone} />
      </defs>
      <circle cx="5" cy="5" r="5" fill={`url(#${id})`} />
    </svg>
  );
}

function ToolbarButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring h-8 rounded-[8px] border border-border bg-background px-2.5 text-[11.5px] font-semibold text-ink-mid hover:text-foreground"
    >
      {label}
    </button>
  );
}

function GraphStat({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-[10px] border border-border bg-card/95 px-2.5 py-1.5 text-[10.5px] text-muted-foreground shadow-sm backdrop-blur">
      <b className="mr-1 text-[12px] text-foreground">{value}</b>
      {label}
    </span>
  );
}

function seedPositions(positions: Map<string, Position>, nodes: WikiGraphNode[]) {
  nodes.forEach((node, index) => {
    if (positions.has(node.id)) return;
    positions.set(node.id, initialPosition(node.id, index, nodes.length));
  });
}

function snapshotPositions(positions: ReadonlyMap<string, Position>): ReadonlyMap<string, Position> {
  return new Map(Array.from(positions, ([id, position]) => [id, { ...position }]));
}

function initialPosition(nodeId: string, index: number, count: number): Position {
  const seed = hash(nodeId);
  const angle = (index / Math.max(1, count)) * Math.PI * 2 + (seed % 100) / 100;
  const radius = count === 1 ? 0 : 70 + Math.sqrt(index + 1) * 26;
  return {
    x: GRAPH_WIDTH / 2 + Math.cos(angle) * radius,
    y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radius,
    vx: 0,
    vy: 0,
    fixed: false,
  };
}

function simulateFrame(
  positions: Map<string, Position>,
  nodes: WikiGraphNode[],
  edges: WikiGraphEdge[],
  alpha: number,
) {
  for (let index = 0; index < nodes.length; index += 1) {
    const current = positions.get(nodes[index].id);
    if (!current || current.fixed) continue;
    for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
      const other = positions.get(nodes[otherIndex].id);
      if (!other) continue;
      let dx = current.x - other.x;
      let dy = current.y - other.y;
      const distanceSquared = dx * dx + dy * dy + 0.1;
      const force = Math.min(4, (1500 * alpha) / distanceSquared);
      const distance = Math.sqrt(distanceSquared);
      dx /= distance;
      dy /= distance;
      current.vx += dx * force;
      current.vy += dy * force;
      if (!other.fixed) {
        other.vx -= dx * force;
        other.vy -= dy * force;
      }
    }
  }
  edges.forEach((edge) => applyLinkForce(positions, edge, alpha));
  nodes.forEach((node) => {
    const point = positions.get(node.id);
    if (!point || point.fixed) return;
    point.vx += (GRAPH_WIDTH / 2 - point.x) * 0.0008 * alpha;
    point.vy += (GRAPH_HEIGHT / 2 - point.y) * 0.0008 * alpha;
    point.vx *= 0.86;
    point.vy *= 0.86;
    point.x += point.vx;
    point.y += point.vy;
  });
}

function applyLinkForce(positions: Map<string, Position>, edge: WikiGraphEdge, alpha: number) {
  const source = positions.get(edge.source);
  const target = positions.get(edge.target);
  if (!source || !target) return;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const pull = (distance - 105) * 0.006 * alpha;
  const forceX = (dx / distance) * pull;
  const forceY = (dy / distance) * pull;
  if (!source.fixed) {
    source.vx += forceX;
    source.vy += forceY;
  }
  if (!target.fixed) {
    target.vx -= forceX;
    target.vy -= forceY;
  }
}

function connectedNodeIds(
  selectedDocumentId: string | null,
  edges: WikiGraphEdge[],
): ReadonlySet<string> {
  if (selectedDocumentId === null) return new Set();
  const result = new Set([selectedDocumentId]);
  edges.forEach((edge) => {
    if (edge.source === selectedDocumentId) result.add(edge.target);
    if (edge.target === selectedDocumentId) result.add(edge.source);
  });
  return result;
}

function closestNode(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest("[data-node-id]") : null;
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nodeRadius(degree: number, maxDegree: number): number {
  if (maxDegree <= 0) return MIN_NODE_RADIUS;
  const importance = Math.sqrt(clamp(degree, 0, maxDegree) / maxDegree);
  return MIN_NODE_RADIUS + importance * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);
}
