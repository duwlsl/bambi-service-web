/**
 * 홈 피드 mock 데이터 — 목업 home-feed.html / home-my-reports.html 문구 그대로.
 *
 * ★★ 실제 API 교체 지점 ★★
 * 홈 피드/내 보고서/관심 자료 저장 API는 미확정(영현 도메인 착수 전, CLAUDE.md §2).
 * 계약 확정 시:
 *   1) 이 파일의 타입을 types/ 로 옮기고 실제 응답 스키마에 맞게 조정
 *   2) 화면(components/home/*)의 mock 직접 import 를 lib/api-client 경유 호출로 교체
 *   3) Loading / Empty / Error / Unauthorized 상태를 §9 에 따라 연결
 * 이 파일은 그 시점에 삭제한다.
 */

/** 카드 본문의 강조 세그먼트 (목업 <b> 대응) */
export type TextSegment = { text: string; bold?: boolean };

export type FeedPost = {
  id: string;
  author: {
    initials: string; // 아바타 이니셜
    name: string;
    handleText: string; // "@parami" · "@value_kim · 팔로잉" 등 목업 표기 그대로
    isMe?: boolean; // .pav.me (주황 워시 아바타)
  };
  meta: string; // "오전 7:20 · 내 브리핑에서 공유"
  title: string;
  body: string;
  showMore?: boolean; // 본문 끝 "더 보기" 표시 여부
  reason: TextSegment[]; // 추천 사유 라인
  media?: "us10y" | "llmGrid" | "fxTrigger"; // mock 차트 종류 (components/home/mock-charts.tsx)
  imgcap?: { caption: string; source: string };
  /** 액션바 초기값. 저장/반응은 화면에서 로컬 state 토글(mock 수준). */
  saved: boolean;
  comments: string;
  likes?: string; // 없으면 내 공유 카드형 액션바(공유 + ⋯)
  views?: string;
};

export type ReportBadge = { label: string; variant: "default" | "od" | "public" };

export type ReportCard = {
  id: string;
  title: string;
  summary: string;
  badges: ReportBadge[];
  meta: string[]; // "·" 로 구분되는 세그먼트
};

export type ReportGroup = { label: string; cards: ReportCard[] };

/* ── 상단 nav / 좌측 메뉴 ── */

export const MOCK_NAV = {
  searchPlaceholder: "브리핑, 토픽, 사용자 검색",
  avatarInitial: "나",
};

export const MOCK_MENU: { icon: string; label: string; count?: string }[] = [
  { icon: "⌂", label: "홈" },
  { icon: "⚑", label: "보관함", count: "23" },
  { icon: "▦", label: "지식창고", count: "128" },
  { icon: "▤", label: "관심사 · LLM Wiki", count: "6" },
  { icon: "◑", label: "프로필" },
];

export const MOCK_MENU_BOTTOM: { icon: string; label: string; count?: string }[] = [
  { icon: "⚙", label: "설정" },
];

export const MOCK_SIDE_FOOT = ["다음 브리핑 · 내일 오전 7:00", "관심사 6개 · 트리거 9개 감시 중"];

/* ── [피드] 탭 ── */

export const MOCK_TODAY = {
  label: "오늘 아침 브리핑",
  time: "7월 9일 목 · 오전 7:00 · 5건",
  privacy: "나만 보기",
  title: "밤사이 42건에서 5건을 골랐어요 — 환율·오픈소스 LLM·보유 종목이 오늘의 핵심",
  summary:
    "원/달러 환율이 설정한 트리거를 건드렸고, 오픈소스 LLM 릴리즈 2건과 보유 종목 실적 일정이 오늘 중요합니다. 각 항목은 왜 골랐는지 근거와 함께 정리했어요.",
  tags: ["환율", "오픈소스 LLM", "보유 종목"],
  moreLabel: "자세히 보기 →",
};

export const MOCK_POSTS: FeedPost[] = [
  {
    id: "post-fx-trigger",
    // 공개 피드 카드라 아바타는 작성자(Parami)의 실제 이니셜. isMe(본인 강조)는 member 에서만 스타일 적용.
    author: { initials: "P", name: "Parami", handleText: "@parami", isMe: true },
    meta: "오전 7:20 · 내 브리핑에서 공유",
    title: "원/달러 환율, 밤사이 0.8% 하락 — 설정한 트리거 조건 충족",
    body: "미 CPI 발표를 앞두고 달러가 약세로 전환했습니다. 새벽 3시 이후 낙폭이 커졌고, 환전 예정 시점(이달 말)과 관련해 확인할 만한 변동이 감지됐어요. ",
    showMore: true,
    reason: [{ text: "관심사 " }, { text: "‘원/달러 환율’", bold: true }, { text: " 트리거 충족" }],
    saved: true,
    comments: "2",
  },
  {
    id: "post-us10y",
    author: { initials: "MW", name: "macro_watcher", handleText: "@macro_w" },
    meta: "오전 7:41 · 공개 브리핑 · 추천",
    title: "미 CPI 발표 전날 밤, 채권시장이 먼저 움직인 이유",
    body: "10년물 금리가 새벽에 6bp 빠졌습니다. 출처 4건을 원문까지 따라가 보면 시장이 이미 낮은 CPI를 가격에 반영하기 시작했다는 해석이 가능합니다.",
    reason: [{ text: "내 관심사 " }, { text: "‘거시경제’", bold: true }, { text: "와 토픽 일치" }],
    media: "us10y",
    imgcap: { caption: "10년물 국채 금리 야간 흐름 — 새벽 3시 이후 하락 전환", source: "출처 · 미 재무부" },
    saved: false,
    comments: "32",
    likes: "128",
    views: "1.8만",
  },
  {
    id: "post-llm-release",
    author: { initials: "AC", name: "ai_curator", handleText: "@ai_cur" },
    meta: "오전 8:05 · 공개 브리핑",
    title: "밤사이 나온 오픈소스 LLM 릴리즈 2건 — 코딩 벤치마크 상위권 진입",
    body: "어젯밤 브리핑에 잡힌 릴리즈 정리. 벤치마크 수치는 전부 원문 링크를 달아뒀고, 두 모델 모두 로컬 구동 요구사양이 낮아진 게 포인트입니다.",
    reason: [{ text: "내 관심사 " }, { text: "‘오픈소스 LLM 동향’", bold: true }, { text: "과 일치" }],
    media: "llmGrid",
    saved: false,
    comments: "14",
    likes: "86",
    views: "9,120",
  },
  {
    id: "post-earnings",
    author: { initials: "VK", name: "value_kim", handleText: "@value_kim · 팔로잉" },
    meta: "오전 6:52 · 공개 브리핑",
    title: "보유 종목 실적 발표 3분 정리 — 가이던스가 핵심",
    body: "오늘 장 마감 후 실적을 내는 종목 3개를 짧게 정리했습니다. 매출보다 다음 분기 가이던스에 시장 반응이 갈릴 가능성이 큽니다.",
    reason: [{ text: "팔로우 중 · 내 보유 종목과 겹침" }],
    saved: false,
    comments: "9",
    likes: "41",
    views: "1.2만",
  },
  {
    id: "post-fx-setup",
    author: { initials: "FX", name: "fx_daily", handleText: "@fx_daily · 팔로잉" },
    meta: "오전 7:10 · 공개 브리핑",
    title: "환전 타이밍, 트리거로 잡는 법 — 내 세팅 공개",
    body: "±0.3% 트리거로 좁혔더니 알림이 늘긴 했지만 놓치는 구간이 줄었어요. 제가 쓰는 조건과 이유를 정리했습니다.",
    reason: [{ text: "팔로우 중 · 토픽 " }, { text: "‘환테크’", bold: true }],
    media: "fxTrigger",
    imgcap: { caption: "점선은 내가 설정한 목표 환율 트리거", source: "출처 · 한국은행" },
    saved: false,
    comments: "21",
    likes: "54",
    views: "6,540",
  },
];

export const MOCK_FEED_END = {
  rec: { title: "오늘 피드는 여기까지예요", sub: "무한 스크롤 대신, 오늘 중요한 것만 골라 보여드려요." },
  mine: {
    title: "최근 보고서 6건을 보여드렸어요",
    subParts: [
      { text: "지난 보고서 검색과 관심사별 모아보기는 " },
      { text: "지식창고", bold: true },
      { text: "에서 할 수 있어요." },
    ] as TextSegment[],
  },
};

/* ── [내 보고서] 탭 ── */

export const MOCK_REPORTS_META = {
  parts: [
    { text: "내가 받은 보고서 " },
    { text: "128건", bold: true },
    { text: " · 이번 주 " },
    { text: "7건", bold: true },
    { text: " — 전체는 " },
  ] as TextSegment[],
  linkLabel: "지식창고",
  tail: "에서",
};

export const MOCK_REPORT_GROUPS: ReportGroup[] = [
  {
    label: "오늘 · 7월 10일",
    cards: [
      {
        id: "rep-fx",
        title: "원/달러 환율, 밤사이 0.8% 하락 — 설정한 트리거 조건 충족",
        summary: "미 CPI 발표를 앞두고 달러가 약세로 전환, 환전 예정 시점과 관련해 확인할 만한 변동이 감지됐습니다.",
        badges: [{ label: "아침 브리핑", variant: "default" }],
        meta: ["#환율", "출처 3건", "오전 7:00"],
      },
      {
        id: "rep-gpu",
        title: "RTX 50 시리즈 국내 출시가 정리 — 관심 GPU 가격 추적 시작",
        summary: "엔비디아 신형 GPU 국내 가격이 공개됐습니다. 목표가 대비 현재 위치를 정리했어요.",
        badges: [{ label: "온디맨드", variant: "od" }],
        meta: ["#쇼핑", "출처 2건", "오후 2:12"],
      },
    ],
  },
  {
    label: "어제 · 7월 9일",
    cards: [
      {
        id: "rep-llm",
        title: "오픈소스 LLM 릴리즈 2건 — 벤치마크 갱신, 로컬 구동 요건 완화",
        summary: "새 모델 2종이 공개됐습니다. 사용 중인 스택 기준으로 적용 가능성을 정리했어요.",
        badges: [
          { label: "아침 브리핑", variant: "default" },
          { label: "공개", variant: "public" },
        ],
        meta: ["#AI", "출처 4건", "♡ 54 · 댓글 2 · 조회 1.1만", "오전 7:00"],
      },
      {
        id: "rep-eur",
        title: "유로 강세 지속 — 분할 환전 2차 실행 시점 점검",
        summary: "달러 인덱스 하락이 이어지며 유로가 강세입니다. 설정하신 분할 환전 기준으로 2차 시점을 점검했어요.",
        badges: [{ label: "아침 브리핑", variant: "default" }],
        meta: ["#환율", "출처 2건", "오전 7:00"],
      },
    ],
  },
  {
    label: "7월 8일",
    cards: [
      {
        id: "rep-semi",
        title: "반도체 수출 규제 변화 — 보유 종목 영향 점검",
        summary: "규제 발표 이후 관련 종목 흐름과 증권가 해석을 모았습니다. 보유 종목 기준 영향은 제한적.",
        badges: [{ label: "아침 브리핑", variant: "default" }],
        meta: ["#반도체", "출처 5건", "오전 7:00"],
      },
      {
        id: "rep-ai-price",
        title: "AI 코딩 도구 요금 개편 — 사용 중인 플랜 영향 비교",
        summary: "주요 AI 코딩 도구 2곳이 요금제를 바꿨습니다. 현재 플랜 기준 유지/이동 시나리오를 비교했어요.",
        badges: [{ label: "아침 브리핑", variant: "default" }],
        meta: ["#AI", "출처 3건", "오전 7:00"],
      },
    ],
  },
];

/* ── 우측 레일 ── */

export const MOCK_SIGNALS = [
  { n: "01", title: "원/달러 환율 0.8% 하락 — 트리거 충족", meta: "#환율 · 신뢰도 높음" },
  { n: "02", title: "오픈소스 LLM 릴리즈 2건", meta: "#AI · 신뢰도 높음" },
  { n: "03", title: "관심 노트북 12% 할인", meta: "#쇼핑 · 3개월 최저가" },
];

export const MOCK_TOPICS = ["#미국증시", "#환테크", "#로컬LLM"];
