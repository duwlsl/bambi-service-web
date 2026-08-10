import { FALLBACK_ERROR_CODE } from "@/constants/errors";
import { ApiError, apiDelete, apiGet } from "@/lib/api-client";
import {
  toWikiDocumentDetail,
  toWikiDocuments,
  toWikiGraph,
  toWikiTags,
} from "@/lib/adapters/wiki";
import type {
  WikiDocument,
  WikiDocumentDetail,
  WikiDocumentDetailData,
  WikiDocumentsData,
  WikiGraph,
  WikiGraphData,
  WikiTag,
  WikiTagsData,
  WikiResetData,
} from "@/types/wiki";

/**
 * 관심사 · LLM Wiki 데이터 repository — 화면 훅과 Service API 사이의 단일 seam.
 *
 * - 모든 엔드포인트는 인증이 필요하다. Bearer 헤더 부착·envelope 해석·401 처리는 공통 api-client 가 한다(§3·§5·§8).
 * - 훅이 authenticated 에서만 호출하므로 여기서 인증 상태를 다시 판단하지 않는다.
 * - 정상 빈 목록(tags·items 0건)은 오류가 아니다 → 그대로 빈 배열을 반환하고 훅이 empty 로 정규화한다.
 *   필수 컨테이너 자체가 빠진 응답만 오류로 승격한다.
 * - 전체 Graph와 문서 상세도 Service API만 호출한다. 브라우저에서 Agent API를 직접 호출하지 않는다.
 */

/** 필수 컨테이너 누락(success:true 인데 data 가 없음 등) — 정상 빈 목록과 구분해 오류로 올린다. */
function requireContainer<T>(data: T | null | undefined, path: string): T {
  if (data === null || data === undefined) {
    throw new ApiError(FALLBACK_ERROR_CODE, `missing data container for ${path}`, 200);
  }
  return data;
}

/** 자동추출 관심 태그 목록. 빈 배열이면 훅이 empty 로 정규화한다. */
export async function fetchWikiTags(signal?: AbortSignal): Promise<WikiTag[]> {
  const path = "/api/wiki/tags";
  const data = requireContainer(await apiGet<WikiTagsData | null>(path, { signal }), path);
  if (!Array.isArray(data.tags)) {
    throw new ApiError(FALLBACK_ERROR_CODE, `invalid tags payload for ${path}`, 200);
  }
  return toWikiTags(data.tags);
}

/** 저장 자료 Wiki 문서 전체 목록. 태그 선택에 따른 필터는 화면 계층(lib/wiki.ts)에서 처리한다. */
export async function fetchWikiDocuments(signal?: AbortSignal): Promise<WikiDocument[]> {
  const path = "/api/wiki/documents";
  const data = requireContainer(await apiGet<WikiDocumentsData | null>(path, { signal }), path);
  if (!Array.isArray(data.items)) {
    throw new ApiError(FALLBACK_ERROR_CODE, `invalid documents payload for ${path}`, 200);
  }
  return toWikiDocuments(data.items);
}

/** 인증 사용자의 전체 Entity·Concept Graph를 조회한다. */
export async function fetchWikiGraph(signal?: AbortSignal): Promise<WikiGraph> {
  const path = "/api/wiki/graph";
  const data = requireContainer(await apiGet<WikiGraphData | null>(path, { signal }), path);
  return toWikiGraph(data);
}

/** 사용자 원본을 보존하고 현재 개인 LLM Wiki 파생 상태를 초기화한다. */
export async function resetWiki(signal?: AbortSignal): Promise<WikiResetData> {
  const path = "/api/wiki";
  return requireContainer(await apiDelete<WikiResetData | null>(path, { signal }), path);
}

export type WikiDocumentDetailResult =
  | { status: "ready"; document: WikiDocumentDetail }
  | { status: "notFound" };

/** Wiki Node 상세를 조회하며 삭제·미소유 문서는 notFound로 정규화한다. */
export async function fetchWikiDocumentDetail(
  documentId: string,
  signal?: AbortSignal,
): Promise<WikiDocumentDetailResult> {
  const path = `/api/wiki/documents/${encodeURIComponent(documentId)}`;
  try {
    const data = requireContainer(
      await apiGet<WikiDocumentDetailData | null>(path, { signal }),
      path,
    );
    const document = toWikiDocumentDetail(data);
    if (document === null) {
      throw new ApiError(FALLBACK_ERROR_CODE, `invalid document payload for ${path}`, 200);
    }
    return { status: "ready", document };
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") return { status: "notFound" };
    throw error;
  }
}
