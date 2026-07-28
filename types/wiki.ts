/**
 * 관심사 · LLM Wiki 화면 모델 (소라/영현 계약 반영, 07-27).
 *
 * 주의: 실 API DTO 는 미확정이다. 여기 타입은 "화면이 실제로 쓰는 필드"만 정의한 화면 모델이다.
 * 관심사 응답 최상위 메타(profileId · version · calculatedAt · status)는 화면에서 쓰지 않으므로
 * 여기서 타입을 굳히지 않는다(실 DTO 확정 시 repository 어댑터가 흡수). 화면 모델 = interests[] 항목만.
 */

/** 관심사 근거. weight 는 상대 가중치, reasons 는 근거 코드(한글 매핑은 constants/wiki.ts). */
export type WikiEvidence = {
  weight: number;
  reasons: string[];
};

/**
 * AI가 이해한 관심사 1건.
 * - score: 최상위 관심사 대비 "상대 관심 강도"(0~1). 스키마 하한은 -1이나 실제 계산은 0~1(음수 없음).
 * - confidence: 별도 신뢰도(0~1).
 * - category: 없을 수 있다(null → 칩 숨김).
 * - documentIds: Wiki 문서(documentId)와 조인하는 키. concept 외 entity/document/schema 도 섞일 수 있다.
 */
export type WikiInterest = {
  interestId: string;
  topic: string;
  category: string | null;
  score: number;
  confidence: number;
  documentIds: string[];
  evidence: WikiEvidence;
};

/**
 * Wiki 문서 1건.
 * - documentKind: concept · entity · document · schema 등(문자열 — 닫힌 union 아님, 미상 종류 방어).
 *   schema 는 화면에서 방어적으로 제외한다(service 가 기본 제외 예정 + 프론트 이중 방어).
 * - summary · domain: 없을 수 있다(null → 상태 문구 / 칩 숨김).
 */
export type WikiDocument = {
  documentId: string;
  title: string;
  summary: string | null;
  documentKind: string;
  domain: string | null;
  sourceCount: number;
  updatedAt: string; // ISO-8601
};
