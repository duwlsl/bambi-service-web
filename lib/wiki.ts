import { EXCLUDED_DOCUMENT_KIND } from "@/constants/wiki";
import type { WikiDocument, WikiInterest } from "@/types/wiki";

/**
 * 화면 표시용 Wiki 문서 필터.
 * 1) documentKind === "schema" 방어적 제외(service 기본 제외 + 프론트 이중 방어).
 * 2) 선택된 관심사가 있으면 그 documentIds 와 조인(교집합)해 제한한다. 없으면 전체(= schema 제외).
 *
 * concept 로 제한하지 않는다(entity/document 등도 표시). 순수 함수 — 화면·레일에서 공유한다.
 */
export function filterWikiDocuments(
  documents: WikiDocument[],
  selectedInterest: WikiInterest | null,
): WikiDocument[] {
  const visible = documents.filter((doc) => doc.documentKind !== EXCLUDED_DOCUMENT_KIND);
  if (!selectedInterest) return visible;
  const allowed = new Set(selectedInterest.documentIds);
  return visible.filter((doc) => allowed.has(doc.documentId));
}
