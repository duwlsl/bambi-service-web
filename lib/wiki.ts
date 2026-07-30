import type { WikiDocument, WikiTag } from "@/types/wiki";

/**
 * 화면 표시용 Wiki 문서 필터.
 * 선택된 태그가 있으면 그 documentIds 와 조인(교집합)해 근거 자료만 남기고, 없으면 전체를 보여준다.
 * documentIds 에만 있고 문서 목록에 없는 id 는 결과에서 자연히 빠진다(조용히 무시 — 화면을 깨뜨리지 않는다).
 *
 * documentKind 기반 제외는 하지 않는다 — 내부 필드라 UI 판단에 쓰지 않기로 확정했고,
 * 표시 대상 선별은 서버 응답(items)이 이미 끝낸 상태다. 순수 함수 — 화면·레일에서 공유한다.
 */
export function filterWikiDocuments(
  documents: WikiDocument[],
  selectedTag: WikiTag | null,
): WikiDocument[] {
  if (!selectedTag) return documents;
  const allowed = new Set(selectedTag.documentIds);
  return documents.filter((doc) => allowed.has(doc.documentId));
}
