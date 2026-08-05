import { toEvidenceReasonMessages } from "@/constants/wiki";
import type {
  WikiDocument,
  WikiDocumentDetail,
  WikiDocumentDetailData,
  WikiDocumentDto,
  WikiDocumentRelation,
  WikiDocumentSource,
  WikiGraph,
  WikiGraphData,
  WikiGraphEdge,
  WikiGraphNode,
  WikiNodeKind,
  WikiTag,
  WikiTagDto,
} from "@/types/wiki";

/**
 * Wiki API DTO → 화면 모델 변환 (lib/adapters/card.ts 와 같은 역할).
 *
 * 백엔드가 준 값만 옮긴다. 없는 값을 만들어내지 않고, category/domain 을 추론하지도 않는다.
 * nullable·미보장 필드는 여기서 한 번에 정규화해 화면에 undefined·null·빈 문자열이 그대로 나가지 않게 한다.
 */

/** 제목이 비어 있을 때만 쓰는 대체 문구 — 빈 카드가 렌더되는 것을 막는다. */
const UNTITLED_DOCUMENT = "제목 없는 자료";

/** 빈 문자열·공백뿐인 값은 "없음"(null)으로 정규화한다. */
function toNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** 숫자가 아니거나 NaN·Infinity 면 fallback 으로 대체한다. */
function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** 문자열 배열만 남긴다(빈 문자열 제외). 배열이 아니면 빈 배열. */
function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function toNodeKind(value: unknown): WikiNodeKind | null {
  return value === "entity" || value === "concept" ? value : null;
}

/** 외부 원본 링크는 http(s)만 허용한다. 내부·잘못된 URL은 링크 없는 출처로 남긴다. */
function toHttpUrl(value: unknown): string | null {
  const text = toNullableText(value);
  if (text === null) return null;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * evidence 는 서버가 내부 키를 보장하지 않는 JSON 객체다.
 * 화면이 쓰는 근거 코드 목록(`reasons`)만 방어적으로 좁혀 꺼낸 뒤, 노출 허용 목록에 있는 코드만
 * 문구로 바꾼다(부정 신호·미상 코드는 제외 — constants/wiki.ts).
 * evidence 형태가 다르거나 남는 근거가 없으면 빈 배열이 되고, 카드는 근거 줄을 렌더하지 않는다.
 * 원본 evidence 는 변형하지 않는다 — 여기서 파생 표시값만 만든다.
 */
function toReasonMessages(evidence: unknown): string[] {
  if (typeof evidence !== "object" || evidence === null) return [];
  return toEvidenceReasonMessages(toStringList((evidence as { reasons?: unknown }).reasons));
}

/**
 * 태그 DTO → 화면 모델.
 * tagId(선택 상태·key) 나 tag(표시할 이름) 가 비어 있으면 카드로 만들 수 없으므로 그 항목만 조용히 제외한다.
 */
export function toWikiTags(items: WikiTagDto[]): WikiTag[] {
  const tags: WikiTag[] = [];
  for (const item of items) {
    const tagId = toNullableText(item?.tagId);
    const tag = toNullableText(item?.tag);
    if (tagId === null || tag === null) continue;

    tags.push({
      tagId,
      tag,
      category: toNullableText(item.category),
      score: toFiniteNumber(item.score, 0),
      confidence: toFiniteNumber(item.confidence, 0),
      documentIds: toStringList(item.documentIds),
      reasonMessages: toReasonMessages(item.evidence),
    });
  }
  return tags;
}

/**
 * 문서 DTO → 화면 모델.
 * documentId 가 없으면 태그의 documentIds 와 조인할 수 없으므로 그 항목만 조용히 제외한다.
 * documentKind 는 내부 필드라 옮기지 않는다(UI 판단·노출에 쓰지 않는다).
 */
export function toWikiDocuments(items: WikiDocumentDto[]): WikiDocument[] {
  const documents: WikiDocument[] = [];
  for (const item of items) {
    const documentId = toNullableText(item?.documentId);
    if (documentId === null) continue;

    documents.push({
      documentId,
      title: toNullableText(item.title) ?? UNTITLED_DOCUMENT,
      summary: toNullableText(item.summary),
      domain: toNullableText(item.domain),
      sourceCount: Math.max(0, Math.trunc(toFiniteNumber(item.sourceCount, 0))),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
    });
  }
  return documents;
}

/** Service API Graph 응답을 유효한 Entity·Concept와 그 사이 Edge로 좁힌다. */
export function toWikiGraph(data: WikiGraphData): WikiGraph {
  const nodes: WikiGraphNode[] = [];
  for (const item of Array.isArray(data?.nodes) ? data.nodes : []) {
    const id = toNullableText(item?.id);
    const title = toNullableText(item?.title);
    const documentKind = toNodeKind(item?.documentKind);
    if (id === null || title === null || documentKind === null) continue;
    nodes.push({
      id,
      documentKind,
      documentKey: toNullableText(item.documentKey) ?? id,
      title,
      subtype: toNullableText(item.subtype),
      summary: toNullableText(item.summary),
      aliases: toStringList(item.aliases),
      filePath: toNullableText(item.filePath) ?? "",
      version: Math.max(1, Math.trunc(toFiniteNumber(item.version, 1))),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
      degree: Math.max(0, Math.trunc(toFiniteNumber(item.degree, 0))),
    });
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: WikiGraphEdge[] = [];
  for (const item of Array.isArray(data?.edges) ? data.edges : []) {
    const id = toNullableText(item?.id);
    const source = toNullableText(item?.source);
    const target = toNullableText(item?.target);
    if (id === null || source === null || target === null) continue;
    if (!nodeIds.has(source) || !nodeIds.has(target)) continue;
    edges.push({ id, source, target, relationType: toNullableText(item.relationType) ?? "related" });
  }

  const rawStats = data?.stats;
  return {
    wikiVersion:
      typeof data?.wikiVersion === "number" && Number.isFinite(data.wikiVersion)
        ? Math.max(1, Math.trunc(data.wikiVersion))
        : null,
    generatedAt: typeof data?.generatedAt === "string" ? data.generatedAt : null,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      entityCount: nodes.filter((node) => node.documentKind === "entity").length,
      conceptCount: nodes.filter((node) => node.documentKind === "concept").length,
      orphanCount: Math.max(0, Math.trunc(toFiniteNumber(rawStats?.orphanCount, 0))),
    },
    nodes,
    edges,
  };
}

/** Wiki 문서 상세를 안전한 외부 URL과 유효한 관련 Node만 포함하는 화면 모델로 변환한다. */
export function toWikiDocumentDetail(data: WikiDocumentDetailData): WikiDocumentDetail | null {
  const documentId = toNullableText(data?.documentId);
  const documentVersionId = toNullableText(data?.documentVersionId);
  const title = toNullableText(data?.title);
  const documentKind = toNodeKind(data?.documentKind);
  if (documentId === null || documentVersionId === null || title === null || documentKind === null) {
    return null;
  }

  const sources: WikiDocumentSource[] = [];
  for (const item of Array.isArray(data.sources) ? data.sources : []) {
    const sourceDocumentId = toNullableText(item?.sourceDocumentId);
    const sourceType = toNullableText(item?.sourceType);
    const sourceTitle = toNullableText(item?.title);
    if (sourceDocumentId === null || sourceType === null || sourceTitle === null) continue;
    sources.push({
      sourceDocumentId,
      sourceType,
      title: sourceTitle,
      canonicalUrl: toHttpUrl(item.canonicalUrl),
      relationType: toNullableText(item.relationType) ?? "derived_from",
    });
  }

  const relations: WikiDocumentRelation[] = [];
  for (const item of Array.isArray(data.relations) ? data.relations : []) {
    const relatedDocumentId = toNullableText(item?.relatedDocumentId);
    const relatedTitle = toNullableText(item?.relatedTitle);
    const relatedDocumentKind = toNodeKind(item?.relatedDocumentKind);
    const direction = item?.direction === "incoming" || item?.direction === "outgoing" ? item.direction : null;
    if (relatedDocumentId === null || relatedTitle === null || relatedDocumentKind === null || direction === null) {
      continue;
    }
    relations.push({
      direction,
      relatedDocumentId,
      relatedDocumentKind,
      relatedTitle,
      relationType: toNullableText(item.relationType) ?? "related",
    });
  }

  return {
    documentId,
    documentVersionId,
    documentKind,
    documentKey: toNullableText(data.documentKey) ?? documentId,
    filePath: toNullableText(data.filePath) ?? "",
    domain: toNullableText(data.domain),
    title,
    summary: toNullableText(data.summary),
    version: Math.max(1, Math.trunc(toFiniteNumber(data.version, 1))),
    sourceCount: Math.max(0, Math.trunc(toFiniteNumber(data.sourceCount, sources.length))),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    markdown: typeof data.markdown === "string" ? data.markdown.trim() : "",
    sources,
    relations,
  };
}
