import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

function compileCommonJs(relativePath, requireModule = () => {
  throw new Error("unexpected require");
}) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourceUrl.pathname,
  });
  const commonJsModule = { exports: {} };
  vm.runInNewContext(
    compiled.outputText,
    { module: commonJsModule, exports: commonJsModule.exports, require: requireModule, URL, Intl },
    { filename: sourceUrl.pathname },
  );
  return commonJsModule.exports;
}

const normalize = compileCommonJs("../lib/normalize.ts");
const reportAdapter = compileCommonJs("../lib/adapters/report.ts", (id) => {
  if (id === "@/lib/normalize") return normalize;
  throw new Error(`unexpected require: ${id}`);
});
const { toReportCoverImage } = reportAdapter;

// 카드 어댑터 — 대표 이미지가 **내 피드·공개 피드 양쪽 화면 모델에 같은 검증으로** 담기는지 본다.
// utils.ts 는 clsx/tailwind-merge(실 패키지)를 쓰므로 alias 가 아닌 id 는 실제 require 로 넘긴다.
const nodeRequire = createRequire(import.meta.url);
const reportType = compileCommonJs("../lib/report-type.ts");
const utils = compileCommonJs("../lib/utils.ts", (id) => nodeRequire(id));
// report-origin 은 프로필 출처의 fromId 를 검증하려고 isUuid(utils)를 쓴다.
const reportOrigin = compileCommonJs("../lib/report-origin.ts", (id) => {
  if (id === "@/lib/utils") return utils;
  throw new Error(`unexpected require: ${id}`);
});
const cardAdapter = compileCommonJs("../lib/adapters/card.ts", (id) => {
  if (id === "@/lib/adapters/report") return reportAdapter;
  if (id === "@/lib/normalize") return normalize;
  if (id === "@/lib/report-type") return reportType;
  if (id === "@/lib/utils") return utils;
  throw new Error(`unexpected require: ${id}`);
});
const { toFeedCardVM, toPublicFeedCardVM } = cardAdapter;

/** 공개 피드 카드 최소 필드 — 테스트마다 필요한 부분만 덮어쓴다. */
function publicCard(overrides) {
  return {
    publicId: "b7f0a4e1-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    title: "제목",
    summary: "요약",
    whyForYou: "",
    author: { publicId: null, username: null, displayName: null },
    likeCount: 0,
    liked: false,
    sources: [],
    createdAt: "2026-08-12T03:36:12.382526Z",
    ...overrides,
  };
}

const VALID_COVER = {
  url: "https://cdn.example.com/cover.jpg",
  sourceUrl: "https://news.example.com/article",
  sourceTitle: "기사 제목",
  reference: "L1",
};

test("HTTP(S) 이미지와 원문 출처를 화면 모델로 정규화한다", () => {
  const cover = toReportCoverImage({
    url: "https://cdn.example.com/cover.jpg",
    sourceUrl: "https://news.example.com/article",
    sourceTitle: "  기사 제목  ",
  });

  assert.equal(cover.url, "https://cdn.example.com/cover.jpg");
  assert.equal(cover.sourceUrl, "https://news.example.com/article");
  assert.equal(cover.sourceLabel, "기사 제목");
});

test("출처 제목이 없으면 원문 host를 출처 라벨로 사용한다", () => {
  const cover = toReportCoverImage({
    url: "https://cdn.example.com/cover.jpg",
    sourceUrl: "https://news.example.com/article",
    sourceTitle: null,
  });

  assert.equal(cover.sourceLabel, "news.example.com");
});

test("이미지나 원문 URL이 안전하지 않으면 대표 이미지를 렌더하지 않는다", () => {
  assert.equal(
    toReportCoverImage({
      url: "javascript:alert(1)",
      sourceUrl: "https://news.example.com/article",
    }),
    null,
  );
  assert.equal(
    toReportCoverImage({
      url: "https://cdn.example.com/cover.jpg",
      sourceUrl: "/relative/article",
    }),
    null,
  );
  assert.equal(
    toReportCoverImage({
      url: "http://127.0.0.1/admin.png",
      sourceUrl: "https://news.example.com/article",
    }),
    null,
  );
  assert.equal(
    toReportCoverImage({
      url: "http://192.168.0.10/cover.jpg",
      sourceUrl: "https://news.example.com/article",
    }),
    null,
  );
});

/* ── 공개 피드 카드(GET /api/feed/public) 대표 이미지 ────────────────────────── */

test("공개 피드 카드의 coverImage 를 화면 모델로 옮긴다", () => {
  const card = toPublicFeedCardVM(publicCard({ coverImage: VALID_COVER }));

  assert.equal(card.coverImage.url, "https://cdn.example.com/cover.jpg");
  assert.equal(card.coverImage.sourceUrl, "https://news.example.com/article");
  assert.equal(card.coverImage.sourceLabel, "기사 제목");
});

test("coverImage 필드가 없거나 null 인 공개 피드 카드는 이미지 없이 정상 변환된다", () => {
  // 필드 자체가 없는 배포본 — 카드는 살아 있고 이미지만 없다(텍스트형 피드).
  const missing = toPublicFeedCardVM(publicCard({}));
  assert.equal(missing.coverImage, null);
  assert.equal(missing.title, "제목");

  assert.equal(toPublicFeedCardVM(publicCard({ coverImage: null })).coverImage, null);
});

test("공개 피드 대표 이미지도 내 피드와 같은 URL 검증을 받는다", () => {
  const unsafe = { ...VALID_COVER, url: "http://192.168.0.10/cover.jpg" };
  const halfDone = { url: "https://cdn.example.com/cover.jpg", sourceUrl: null };

  assert.equal(toPublicFeedCardVM(publicCard({ coverImage: unsafe })).coverImage, null);
  assert.equal(toPublicFeedCardVM(publicCard({ coverImage: halfDone })).coverImage, null);
  // 같은 입력이면 내 피드 화면 모델도 같은 결과여야 한다(두 화면이 같은 서버 필드를 본다).
  assert.equal(
    toFeedCardVM({ ...publicCard({ coverImage: unsafe }), visibility: "PUBLIC" }).coverImage,
    null,
  );
  assert.equal(
    toFeedCardVM({ ...publicCard({ coverImage: VALID_COVER }), visibility: "PUBLIC" }).coverImage.url,
    "https://cdn.example.com/cover.jpg",
  );
});

/* ── 카드 렌더 결과 — 대표 이미지가 어느 화면에 어떤 모양으로 나타나는지 ─────────────
 *
 * 클래스 문자열이 아니라 **렌더된 마크업**을 본다: 썸네일 <img> 가 생기는지, 그 이미지를
 * 감싸는 링크가 이름과 목적지를 갖는지, 값이 없거나 로드에 실패했을 때 영역이 통째로
 * 사라지는지. 서버 렌더(react-dom/server)라 이벤트는 발생시킬 수 없어서, 로드 실패는
 * "실패 URL 이 기록된 상태"를 useState 로 주입해 같은 분기를 태운다(아래 renderFailed).
 * 실제 onError 발생 경로는 브라우저 검수에서 확인한다.
 * ------------------------------------------------------------------------------- */

const React = nodeRequire("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server");

/** TSX 컴파일 — JSX 는 react/jsx-runtime 으로 내보내 컴포넌트 파일 원본을 그대로 쓴다. */
function compileComponent(relativePath, requireModule) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: sourceUrl.pathname,
  });
  const commonJsModule = { exports: {} };
  vm.runInNewContext(
    compiled.outputText,
    { module: commonJsModule, exports: commonJsModule.exports, require: requireModule, URL, Intl },
    { filename: sourceUrl.pathname },
  );
  return commonJsModule.exports;
}

/** next/link 대역 — href 를 그대로 넘기는 <a>. 나머지 props(aria-label·className)도 보존한다. */
const linkStub = {
  __esModule: true,
  default: ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children),
};
/** 이번 검증 대상이 아닌 카드 부속 — 렌더 결과에 영향을 주지 않도록 비운다. */
const emptyComponent = () => null;

function componentRequire(extra = {}) {
  return (id) => {
    if (id === "react") return extra.react ?? React;
    if (id === "react/jsx-runtime") return nodeRequire("react/jsx-runtime");
    if (id === "next/link") return linkStub;
    if (id === "@/components/home/post-more-menu") return { PostMoreMenu: emptyComponent };
    if (id === "@/components/report/card-scrap-button") return { CardScrapButton: emptyComponent };
    if (id === "@/components/report/report-type-badge") return { ReportTypeBadge: emptyComponent };
    // 좋아요 UI 는 social=null 인 카드로 테스트해 호출 자체가 없다(아래 feedCardVM 참조).
    if (id === "@/components/auth/use-require-auth") return {};
    if (id === "@/hooks/use-card-like") return {};
    // 상세 링크 생성(진입 출처 포함) — 순수 함수라 stub 이 아니라 실제 모듈을 그대로 쓴다.
    if (id === "@/lib/report-origin") return reportOrigin;
    throw new Error(`unexpected require: ${id}`);
  };
}

const { PublicFeedCard } = compileComponent(
  "../components/home/public-feed-card.tsx",
  componentRequire(),
);
const { FeedCard } = compileComponent("../components/home/feed-card.tsx", componentRequire());

const CARD_ID = "b7f0a4e1-2c3d-4e5f-8a9b-0c1d2e3f4a5b";
const COVER_VM = {
  url: "https://cdn.example.com/cover.jpg",
  sourceUrl: "https://news.example.com/article",
  sourceLabel: "기사 제목",
};

/** 공개 피드 화면 모델 — 액션바(보관·좋아요)는 값이 없으면 렌더되지 않으므로 null 로 둔다. */
function publicVM(coverImage) {
  return {
    publicId: CARD_ID,
    title: "반도체 공급망 브리핑",
    summary: "요약",
    author: { publicId: null, displayName: "작성자", username: null, initial: "작" },
    social: null,
    scrapped: null,
    sources: [],
    createdAtLabel: "2026년 8월 12일",
    tags: [],
    matchedTopics: [],
    matchedCategories: [],
    coverImage,
  };
}

/** 내 보고서 화면 모델 — 같은 서버 필드(coverImage)를 담고 있어도 카드가 렌더하지 않아야 한다. */
function myReportVM(coverImage) {
  return {
    publicId: CARD_ID,
    title: "내 보고서",
    summary: "요약",
    visibility: "PRIVATE",
    tags: [],
    reportType: null,
    sources: [],
    createdAtLabel: "2026년 8월 12일",
    createdAtTimeLabel: "오후 2:10",
    createdAtMs: 0,
    coverImage,
  };
}

const render = (element) => renderToStaticMarkup(element);
const imgCount = (html) => (html.match(/<img\b/g) ?? []).length;

test("공개 피드 카드는 대표 이미지가 있으면 썸네일 영역을 렌더한다", () => {
  const html = render(React.createElement(PublicFeedCard, { card: publicVM(COVER_VM) }));

  assert.equal(imgCount(html), 1);
  assert.match(html, /<img[^>]+src="https:\/\/cdn\.example\.com\/cover\.jpg"/);
  // 썸네일은 상세로 가는 링크 안에 있고, 그 링크에는 실제 카드 제목으로 만든 이름이 있다.
  const anchor = html.match(/<a[^>]*aria-label="[^"]*"[^>]*>\s*<img[^>]*>\s*<\/a>/);
  assert.ok(anchor, "썸네일이 이름 있는 링크로 감싸여 있어야 한다");
  assert.match(anchor[0], /aria-label="반도체 공급망 브리핑 보고서 보기"/);
  // 공개 피드 카드의 상세 링크는 진입 출처(`?from=feed`)를 함께 싣는다 — 상세의 뒤로가기가
  // `← 홈 피드로` 로 뜨고 홈 피드로 되돌아가게 하는 값이다(tests/report-back-link.test.mjs).
  assert.match(anchor[0], new RegExp(`href="/report/${CARD_ID}\\?from=feed"`));
  // 장식 이미지 규칙은 유지 — 이름은 링크가 갖고 이미지는 빈 alt 다.
  assert.match(anchor[0], /alt=""/);
});

test("공개 피드 카드에 대표 이미지가 없으면 썸네일 영역을 만들지 않는다", () => {
  const html = render(React.createElement(PublicFeedCard, { card: publicVM(null) }));

  assert.equal(imgCount(html), 0);
  // 빈 박스·자리표시자 없이 카드 본문은 그대로 렌더된다.
  assert.match(html, /반도체 공급망 브리핑/);
  assert.ok(!html.includes("보고서 보기"), "이미지가 없으면 썸네일 링크도 없어야 한다");
});

test("이미지 로드에 실패한 URL 은 썸네일 영역이 통째로 사라진다", () => {
  // 실패 상태 주입 — 이 트리의 useState 는 CardMedia 의 failedUrl 하나뿐이라(아래에서 검증)
  // 초기값 null 을 실패 URL 로 바꿔치면 onError 직후와 같은 렌더가 된다.
  let useStateCalls = 0;
  const reactWithFailure = {
    ...React,
    useState: (initial) => {
      useStateCalls += 1;
      return [initial === null ? COVER_VM.url : initial, () => {}];
    },
  };
  const { PublicFeedCard: FailingCard } = compileComponent(
    "../components/home/public-feed-card.tsx",
    componentRequire({ react: reactWithFailure }),
  );

  const html = render(React.createElement(FailingCard, { card: publicVM(COVER_VM) }));

  assert.equal(useStateCalls, 1, "이 테스트는 CardMedia 의 useState 하나만 가정한다");
  assert.equal(imgCount(html), 0);
  assert.ok(!html.includes("보고서 보기"), "빈 테두리만 남은 링크가 없어야 한다");
  assert.match(html, /반도체 공급망 브리핑/); // 카드 나머지는 그대로
});

test("내 보고서 카드는 대표 이미지가 있어도 썸네일을 렌더하지 않는다", () => {
  const withCover = render(React.createElement(FeedCard, { card: myReportVM(COVER_VM) }));
  const withoutCover = render(React.createElement(FeedCard, { card: myReportVM(null) }));

  assert.equal(imgCount(withCover), 0);
  // 이미지 유무와 무관하게 카드 마크업이 같아야 한다 — 이미지가 차지하던 영역·여백이 없다는 뜻.
  assert.equal(withCover, withoutCover);
});
