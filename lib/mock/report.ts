import type { TextSegment } from "@/lib/mock/feed";

/**
 * 카드(리포트) 상세 mock 데이터 — 목업 report-detail.html 문구 그대로.
 *
 * ★★ 실제 API 교체 지점 ★★
 * 카드 상세 API는 미확정(영현 도메인 착수 전, CLAUDE.md §2).
 * - 본문은 API가 content_md(마크다운 원문, DECISION-031 생성 시점 MD 저장 A안)로 내려줄 예정
 *   → 마크다운 렌더러로 .md-viewer(globals.css)에 렌더한다.
 *   본문 mock은 "렌더된 결과"를 흉내내야 하므로 JSX로
 *   components/report/report-body-mock.tsx 에 있다.
 * - 계약 확정 시: 타입을 types/ 로 이관, 화면의 mock 직접 import 를 lib/api-client 경유로
 *   교체, Loading/Empty/Error/NotFound 상태(§9)를 연결하고 이 파일과 body mock을 삭제한다.
 */

export const MOCK_REPORT = {
  readbar: {
    backLabel: "홈 피드로",
    mdCopyLabel: "⧉ MD 복사",
    shareLabel: "↗ 공유",
  },
  head: {
    avatar: "나",
    name: "내 아침 브리핑",
    nameSub: "· 항목 1/5",
    meta: "오늘 오전 7:00 생성 · 밤사이 수집 42건 중 선별",
    pill: "나만 보기",
  },
  title: "원/달러 환율, 밤사이 0.8% 하락 — 설정한 트리거 조건 충족",
  lead: "미 CPI 발표를 앞두고 달러가 약세로 전환, 회원님의 환전 예정 시점과 관련한 변동이 감지됐습니다.",
  meta: {
    sourceCount: "3건",
    trust: "● 신뢰도 높음",
    reason: [
      { text: "왜 나에게 왔나: 관심사 " },
      { text: "‘원/달러 환율’", bold: true },
      { text: " 트리거 충족" },
    ] as TextSegment[],
  },
  /** 초기 보관 상태 — readbar "⚑ 보관됨" (data-on="1") */
  savedInitially: true,
};

export type SourceRow = {
  no: string;
  trust: "high" | "mid"; // srcrow .dot / .dot.mid
  name: string;
  pub: string;
  type: string; // .stp 배지
};

export const MOCK_SOURCES: { count: string; rows: SourceRow[] } = {
  count: "3건",
  rows: [
    {
      no: "[1]",
      trust: "high",
      name: "한국은행 — 외환시장 동향 공시",
      pub: "한국은행 · 2026-07-09 05:10",
      type: "공식 발표",
    },
    {
      no: "[2]",
      trust: "high",
      name: "달러 약세 전환 보도 2건",
      pub: "주요 경제지 · 2026-07-09 04:42",
      type: "주요 언론",
    },
    {
      no: "[3]",
      trust: "mid",
      name: "야간 거래 반응 스레드",
      pub: "외환 커뮤니티 · 참고용 · 03:58",
      type: "커뮤니티",
    },
  ],
};

export const MOCK_MEMO = {
  blockTitle: "댓글 · 메모",
  blockSub: "비공개 상태 — 나만 메모 가능",
  memo: {
    avatar: "나",
    name: "Parami",
    time: "방금 · 나만 보는 메모",
    text: "이달 말 환전 · 목표가 근접. CPI 결과 보고 분할로 진행. 트리거 ±0.3%로 좁힐지 검토.",
  },
  inputPlaceholder: "메모를 입력하세요", // 공개 전환 시 "댓글을 입력하세요" (P1)
  note: "공개 브리핑으로 전환하면 다른 사용자가 댓글을 남길 수 있어요.",
};

export const MOCK_DETAIL_RAIL = {
  next: {
    title: "다음 항목",
    counter: "02 / 05",
    item: { title: "오픈소스 LLM 신규 릴리즈 2건 — 벤치마크 갱신", meta: "AI · 출처 2건 · 신뢰도 높음" },
    cta: "다음 항목 읽기 →",
  },
  trust: {
    title: "출처 신뢰도 요약",
    rows: [
      { label: "출처", value: "3건" },
      { label: "종합 신뢰도", value: "높음", ok: true },
      { label: "마지막 업데이트", value: "05:10" },
    ],
  },
  related: {
    title: "관련 브리핑",
    all: "내 기록",
    items: [
      { title: "미 금리 인하 시점 전망 — 3가지 시나리오", meta: "지난주 보관함 · 거시경제" },
      { title: "달러 인덱스 4개월 최저 — 배경 정리", meta: "2일 전 브리핑 · 환율" },
      { title: "환전 수수료 비교 — 주요 은행 5곳", meta: "3주 전 보관함 · 환테크" },
    ],
  },
};

export const MOCK_DETAIL_SIDE_FOOT = ["마크다운으로 생성된 브리핑 본문을 뷰어로 렌더링합니다."];
