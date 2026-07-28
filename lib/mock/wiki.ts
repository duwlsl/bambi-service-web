import type { WikiDocument, WikiInterest } from "@/types/wiki";

/**
 * 관심사 · LLM Wiki mock fixture — 실 API 미확정이라 repository seam(lib/repositories/wiki.ts)이
 * 이 값을 반환한다. 컴포넌트/훅은 이 모듈을 직접 import 하지 않는다(seam 경유만).
 *
 * - score 는 최상위 관심사(1.0) 대비 상대 강도(0~1). documentIds 는 아래 문서 documentId 를 참조한다.
 * - doc-schema-1(schema)은 int-fx 의 documentIds 에 섞여 있으나 화면 필터에서 제외되어야 한다(검증용).
 */
export const MOCK_WIKI_INTERESTS: WikiInterest[] = [
  {
    interestId: "int-fx",
    topic: "원/달러 환율",
    category: "거시경제",
    score: 1,
    confidence: 0.91,
    documentIds: ["doc-fx-concept", "doc-fx-entity", "doc-schema-1"],
    evidence: { weight: 0.9, reasons: ["SAVED_FREQUENTLY", "VIEWED_REPEATEDLY"] },
  },
  {
    interestId: "int-llm",
    topic: "오픈소스 LLM 동향",
    category: null,
    score: 0.68,
    confidence: 0.83,
    documentIds: ["doc-llm-concept", "doc-llm-doc"],
    evidence: { weight: 0.6, reasons: ["ONBOARDING_ADDED", "RECENT_ACTIVITY_UP"] },
  },
  {
    interestId: "int-laptop",
    topic: "노트북 특가",
    category: "쇼핑",
    score: 0.42,
    confidence: 0.78,
    documentIds: ["doc-laptop-entity"],
    evidence: { weight: 0.4, reasons: ["SAVED_FREQUENTLY"] },
  },
];

export const MOCK_WIKI_DOCUMENTS: WikiDocument[] = [
  {
    documentId: "doc-fx-concept",
    title: "원/달러 환율",
    summary: "달러 대비 원화 가치를 나타내는 지표로, 수출입·물가에 영향을 준다.",
    documentKind: "concept",
    domain: "거시경제",
    sourceCount: 5,
    updatedAt: "2026-07-25T23:10:00Z",
  },
  {
    documentId: "doc-fx-entity",
    title: "미 CPI (소비자물가지수)",
    summary: null,
    documentKind: "entity",
    domain: "거시경제",
    sourceCount: 3,
    updatedAt: "2026-07-24T02:30:00Z",
  },
  {
    documentId: "doc-schema-1",
    title: "환율 알림 스키마",
    summary: "내부 스키마 문서 — 사용자 화면에는 노출하지 않는다.",
    documentKind: "schema",
    domain: null,
    sourceCount: 0,
    updatedAt: "2026-07-20T00:00:00Z",
  },
  {
    documentId: "doc-llm-concept",
    title: "오픈소스 LLM",
    summary: "가중치가 공개된 대규모 언어모델과 그 생태계.",
    documentKind: "concept",
    domain: "AI",
    sourceCount: 8,
    updatedAt: "2026-07-26T09:15:00Z",
  },
  {
    documentId: "doc-llm-doc",
    title: "이번 주 LLM 릴리즈 노트 모음",
    summary: null,
    documentKind: "document",
    domain: null,
    sourceCount: 4,
    updatedAt: "2026-07-26T22:40:00Z",
  },
  {
    documentId: "doc-laptop-entity",
    title: "게이밍 노트북",
    summary: "고성능 GPU를 탑재한 노트북 카테고리.",
    documentKind: "entity",
    domain: "쇼핑",
    sourceCount: 2,
    updatedAt: "2026-07-22T11:05:00Z",
  },
];
