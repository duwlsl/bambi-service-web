import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * [AI가 이해한 지금의 나] 관심도 단계 표시의 불변식.
 *
 * 목적은 두 가지다.
 *  ① 단계 기준이 한 곳(lib/interest-level.ts)에만 있고 컴포넌트가 임계값·문구를 다시 쓰지 않는지.
 *  ② 실제로 렌더된 행이 점수 크기에 따라 색·라벨이 갈리고, **점수 0 과 점수 없음이 다르게** 나오는지.
 *
 * 렌더 검증은 tests/report-delta.test.mjs 의 "TSX 를 트랜스파일해 vm 에서 실행" 패턴을 그대로 쓴다.
 * 화면 상태를 억지로 만들지 않고 실제 컴포넌트가 만드는 HTML 을 본다.
 */
const nodeRequire = createRequire(import.meta.url);

function loadTsModule(relativePath, requireShim = () => {
  throw new Error("unexpected require");
}) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: sourceUrl.pathname,
  });
  const commonJsModule = { exports: {} };
  vm.runInNewContext(
    compiled.outputText,
    { module: commonJsModule, exports: commonJsModule.exports, require: requireShim },
    { filename: sourceUrl.pathname },
  );
  return commonJsModule.exports;
}

const level = loadTsModule("../lib/interest-level.ts");
const {
  INTEREST_LEVEL_BAR_CLASS,
  INTEREST_LEVEL_LABEL,
  INTEREST_LEVEL_MIN_SCORE,
  interestBarWidthPercent,
  resolveInterestLevel,
} = level;

const interestCategory = loadTsModule("../lib/interest-category.ts");

/** WikiMind 가 쓰는 상태 컴포넌트는 이 테스트의 관심사가 아니라 최소 stub 으로 대체한다. */
const { WikiMind } = loadTsModule("../components/wiki/wiki-mind.tsx", (id) => {
  if (id === "react/jsx-runtime") return nodeRequire("react/jsx-runtime");
  if (id === "@/lib/interest-category") return interestCategory;
  if (id === "@/lib/interest-level") return level;
  if (id === "@/components/home/feed-skeleton") return { FeedSkeleton: () => null };
  if (id === "@/components/ui/state-icons") return { IconAlert: () => null, IconEmptyDoc: () => null };
  if (id === "@/components/ui/state-view") return { StateView: () => null };
  throw new Error(`unexpected require: ${id}`);
});

const mindSource = readFileSync(
  new URL("../components/wiki/wiki-mind.tsx", import.meta.url),
  "utf8",
);

/** "이 문구가 없어야 한다" 류 검사는 주석을 뺀 코드만 본다(결정 근거를 주석에 남길 수 있게). */
function code(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
const mindCode = code(mindSource);

/* ────────────────────────── 단계 함수 ────────────────────────── */

// vm.runInNewContext 로 만든 객체는 outer 렐름의 Object.prototype 과 달라 deepEqual 이
// "구조는 같지만 참조가 다르다"로 실패한다(cross-realm). 펼쳐서 outer 객체로 옮겨 비교한다.
test("단계는 0~1 을 4등분한 고정 임계값으로 나눈다", () => {
  assert.deepEqual({ ...INTEREST_LEVEL_MIN_SCORE }, {
    veryHigh: 0.75,
    high: 0.5,
    medium: 0.25,
    low: 0,
  });
});

test("경계값이 상위 단계에 포함된다", () => {
  assert.equal(resolveInterestLevel(1), "veryHigh");
  assert.equal(resolveInterestLevel(0.75), "veryHigh");
  assert.equal(resolveInterestLevel(0.7499), "high");
  assert.equal(resolveInterestLevel(0.5), "high");
  assert.equal(resolveInterestLevel(0.4999), "medium");
  assert.equal(resolveInterestLevel(0.25), "medium");
  assert.equal(resolveInterestLevel(0.2499), "low");
});

test("점수 0 은 최하 단계이고, 점수 없음(null)은 단계 자체가 없다", () => {
  // 0 은 서버가 실제로 준 값 → 등급이 있다. null 은 값이 없는 것 → 등급을 만들지 않는다.
  assert.equal(resolveInterestLevel(0), "low");
  assert.equal(resolveInterestLevel(null), null);
  // undefined·NaN 도 값 없음으로 다룬다(등급을 지어내지 않는다).
  assert.equal(resolveInterestLevel(undefined), null);
  assert.equal(resolveInterestLevel(Number.NaN), null);
});

test("라벨은 크기만 말하고 시간·최근 활동을 암시하지 않는다", () => {
  assert.deepEqual({ ...INTEREST_LEVEL_LABEL }, {
    veryHigh: "매우 높음",
    high: "높음",
    medium: "보통",
    low: "낮음",
  });
  /*
    목업 wiki.html 의 "꾸준함"·"가끔"·"잠시 쉬는 중" 은 최근 활동·지속성을 뜻하는데
    GET /api/wiki/tags 에는 그걸 뒷받침하는 필드가 없다(score 는 합산된 상대 강도 하나뿐).
  */
  for (const source of [JSON.stringify({ ...INTEREST_LEVEL_LABEL }), mindCode]) {
    assert.doesNotMatch(source, /꾸준|가끔|쉬는 중|최근|요즘|활발/);
  }
});

test("막대 색은 새 색을 만들지 않고 주황 한 계열(--primary)의 농도 4단계만 쓴다", () => {
  const classes = Object.values(INTEREST_LEVEL_BAR_CLASS);
  assert.equal(new Set(classes).size, 4, "단계별로 색이 달라야 한다");
  for (const className of classes) {
    assert.match(className, /^bg-primary(\/\d+)?$/);
  }
  // 최상단도 원색(alpha 없는 bg-primary)이 아니다 — 형광색처럼 튀지 않는 코랄 농도까지만 올린다.
  assert.doesNotMatch(classes.join(" "), /(^|\s)bg-primary(\s|$)/);
  // 회색(비활성)은 API 가 비활성 상태를 줄 때만 — 지금 계약엔 없다.
  assert.doesNotMatch(classes.join(" "), /gray|slate|muted|low/);
  // 원색 하드코딩·무지개 팔레트 금지.
  const levelSource = readFileSync(new URL("../lib/interest-level.ts", import.meta.url), "utf8");
  assert.doesNotMatch(code(levelSource), /#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(|chart-\d/);
});

test("막대 폭은 서버 값 그대로 쓰고 최소 폭만 보장한다", () => {
  assert.equal(interestBarWidthPercent(1), 100);
  assert.equal(interestBarWidthPercent(0.42), 42);
  assert.equal(interestBarWidthPercent(0.25), 25);
  // 차이를 키우는 보정 없음 — 8% 는 "막대가 사라지지 않게" 하는 하한이다.
  assert.equal(interestBarWidthPercent(0.03), 8);
  assert.equal(interestBarWidthPercent(0), 8);
});

test("임계값·라벨·색은 컴포넌트에 중복 정의하지 않는다", () => {
  assert.match(mindSource, /from "@\/lib\/interest-level"/);
  // 임계값 비교·임계 상수는 컴포넌트에 없다(0.5 는 Tailwind 간격 클래스와 겹치므로 제외).
  assert.doesNotMatch(mindCode, /score\s*[<>]=?/);
  assert.doesNotMatch(mindCode, /\b0\.75\b|\b0\.25\b/);
  assert.doesNotMatch(mindCode, /매우 높음|"높음"|"보통"|"낮음"/);
  assert.doesNotMatch(mindCode, /bg-primary\//);
});

/* ────────────────────────── 실제 렌더된 행 ────────────────────────── */

function taxonomy() {
  return {
    version: "v1",
    sourceHash: "hash",
    locale: "ko",
    publishedAt: "2026-08-01T00:00:00Z",
    categories: [
      {
        id: "tech",
        name: "테크·IT",
        nameEn: "Tech",
        description: "",
        emoji: "💻",
        order: 1,
        topics: [
          { id: "ai", name: "AI", nameEn: "AI", description: "", order: 1, keywords: ["인공지능"] },
        ],
      },
    ],
  };
}

function tag(name, score) {
  return {
    tagId: `tag-${name}`,
    tag: name,
    category: null,
    score,
    confidence: 0.5,
    documentIds: [],
    reasonMessages: [],
  };
}

function interest(id, name) {
  return {
    id,
    name,
    source: "USER",
    taxonomyVersion: null,
    categoryId: null,
    topicId: null,
    createdAt: "2026-08-01T00:00:00Z",
  };
}

/** 상·하위 점수 · 0 · 점수 없음 · 긴 이름 · USER+AI 겹침을 한 화면에 담은 렌더 결과. */
const LONG_NAME = "아주 긴 관심사 이름 — 반도체 공급망과 온디바이스 추론 가속기 시장 동향";
const html = renderToStaticMarkup(
  WikiMind({
    taxonomy: { status: "success", data: taxonomy(), refetch: () => {} },
    tags: {
      status: "success",
      data: [
        tag("AI", 1),
        tag("환율", 0.6),
        tag("노트북", 0.3),
        tag(LONG_NAME, 0.05),
        tag("반도체", 0),
      ],
      refetch: () => {},
    },
    // "AI" 는 태그와 겹치는 직접 등록 항목(점수 유지), "등산" 은 점수 없는 직접 등록 항목.
    myInterests: [interest(1, "AI"), interest(2, "등산")],
  }),
);

/** 같은 데이터에서 내 관심사만 뺀 렌더 — `직접 추가` 구역이 비는 경우를 본다. */
const htmlNoUser = renderToStaticMarkup(
  WikiMind({
    taxonomy: { status: "success", data: taxonomy(), refetch: () => {} },
    tags: { status: "success", data: [tag("AI", 1), tag("환율", 0.6)], refetch: () => {} },
    myInterests: [],
  }),
);

test("점수 크기에 따라 막대 색과 길이가 갈린다", () => {
  for (const className of Object.values(INTEREST_LEVEL_BAR_CLASS)) {
    assert.ok(html.includes(className), `${className} 막대가 없다`);
  }
  // 막대 길이는 실제 값 그대로(1 → 100%, 0.6 → 60%, 0.3 → 30%).
  for (const width of ["width:100%", "width:60%", "width:30%"]) {
    assert.ok(html.includes(width), `${width} 막대가 없다`);
  }
});

test("관심도 등급은 눈에 보이는 글자로 두지 않고 막대 길이로만 보여준다", () => {
  /*
    등급 글자(매우 높음·높음·…)와 점수 없음의 "—" 는 막대와 같은 자리에서 같은 정보를 반복해
    행을 빽빽하게 만들었다(2026-08-13). 화면에서는 걷어내되, 막대가 aria-hidden 이라
    **스크린리더용 sr-only 로는 남긴다** — 낭독까지 비면 관심도가 통째로 사라진다.
  */
  for (const label of Object.values(INTEREST_LEVEL_LABEL)) {
    assert.match(html, new RegExp(`sr-only[^>]*>관심도 ${label}<`), `${label} 이 sr-only 밖에 있다`);
  }
  // 점수 없음 자리를 채우던 "—" 칸도 없앴다(관심사 이름 안의 — 는 그대로다 → 단독 노드만 본다).
  assert.doesNotMatch(html, />\s*—\s*</);
  assert.doesNotMatch(html, /관심도 정보 없음/);
});

test("점수 0 은 막대를 갖고, 점수 없음은 막대 자체를 만들지 않는다", () => {
  // 0 → 최소 폭 막대. (막대가 아예 없으면 값이 없는 항목과 구별되지 않는다)
  assert.ok(html.includes("width:8%"));
  // 막대 개수 = 점수가 있는 5건. 점수 없는 "등산" 행에는 빈 트랙조차 그리지 않는다.
  assert.equal(html.split("rounded-full bg-background").length - 1, 5);
  assert.doesNotMatch(mindCode, /width: `\$\{interestBarWidthPercent\(0\)/);
});

test("출처는 주황 점이 아니라 구역 제목으로 나눈다", () => {
  // 칩([내 관심사])도, 그 뒤에 썼던 이름 앞 주황 점도 남아 있지 않다.
  assert.doesNotMatch(html, /내 관심사/);
  assert.doesNotMatch(html, /h-1\.5 w-1\.5/);
  assert.doesNotMatch(mindCode, /bg-transparent/);
  // 점을 설명하던 sr-only 문구도 함께 걷었다 — 이제 구역 제목이 그 일을 한다.
  assert.doesNotMatch(html, />직접 추가한 관심사</);
  // 구역 제목 2개, `직접 추가` 가 먼저다. (안내 문구의 "직접 추가한…" 은 `<` 가 안 붙어 걸리지 않는다)
  const userAt = html.indexOf(">직접 추가<");
  const inferredAt = html.indexOf(">AI 발견<");
  assert.ok(userAt > -1, "직접 추가 구역 제목이 없다");
  assert.ok(inferredAt > -1, "AI 발견 구역 제목이 없다");
  assert.ok(userAt < inferredAt, "직접 추가 구역이 먼저 와야 한다");
  // 제목은 글자만 — 이모지·개수 배지를 붙이지 않는다.
  assert.match(html, /<h3[^>]*>직접 추가<\/h3>/);
});

test("항목이 없는 구역은 헤더째 렌더하지 않는다", () => {
  assert.doesNotMatch(htmlNoUser, />직접 추가</);
  assert.match(htmlNoUser, />AI 발견</);
});

test("긴 이름은 말줄임으로 처리해 다른 칸을 밀어내지 않는다", () => {
  assert.ok(html.includes(LONG_NAME.slice(0, 12)));
  assert.match(mindSource, /min-w-0 truncate text-\[13px\]/);
  // 대분류 칩은 열 폭을 넘지 못하고 넘치면 말줄임 → 긴 분류명이 행을 밀어내지 않는다.
  assert.match(mindSource, /max-w-full justify-self-end truncate/);
});

/* ────────────────────────── 열 정렬 · 간격 ────────────────────────── */

test("열 너비를 템플릿이 정해 칩 유무와 무관하게 트랙 시작·끝이 같다", () => {
  // <480px = 2열 2행, ≥480px = 3열 1행. 폭이 내용에 따라 늘거나 줄지 않는다.
  assert.match(mindSource, /grid-cols-\[minmax\(0,1fr\)_6\.5rem\]/);
  assert.match(mindSource, /min-\[480px\]:grid-cols-\[10\.5rem_minmax\(0,1fr\)_6\.5rem\]/);
  /*
    flex 시절 막대가 `flex-1` 로 남는 폭을 먹어서, 칩이 없는 행은 트랙이 오른쪽 끝까지 늘고
    칩이 있는 행은 짧아졌다(2026-08-13 브라우저 검수). 폭을 내용에서 떼어 낸 뒤로 이 클래스들은
    **행 안에** 다시 들어오면 안 된다(구역 제목의 구분선은 flex-1 로 남는 폭을 채우는 게 맞다 —
    그래서 파일 전체가 아니라 MindRow 본문만 본다).
  */
  const rowCode = code(mindSource.slice(mindSource.indexOf("function MindRow(")));
  assert.doesNotMatch(rowCode, /flex-1|ml-auto|order-last/);
  // 셀마다 명시적 열 지정 → 앞 셀(막대)이 없어도 칩이 2열로 당겨지지 않는다.
  assert.match(mindSource, /col-start-2 row-start-1[^"]*min-\[480px\]:col-start-3/);
  // 모바일에서 막대는 두 열을 모두 덮는다 → 칩이 있든 없든 트랙 폭이 같다.
  assert.match(mindSource, /col-span-2 col-start-1 row-start-2/);
  assert.doesNotMatch(mindCode, /min-\[360px\]/);
});

test("구역 사이 여백이 행 사이보다 확실히 크다", () => {
  assert.match(mindSource, /<ul className="flex flex-col gap-3">/);
  assert.match(mindSource, /<div className="flex flex-col gap-6">/);
});

/* ────────────────────────── 구역 분리 · 정렬 ────────────────────────── */

test("대분류 묶음은 되살리지 않는다", () => {
  // 그룹 헤더·개수·이모지가 없다. 분류 자체는 lib 규칙 그대로 쓰고 표시만 바꾼다.
  assert.match(mindSource, /groupInterestsByCategory\(taxonomy\.data, wikiTags, myInterests\)/);
  assert.doesNotMatch(mindCode, /SHOW_EMPTY_CATEGORIES|group\.emoji|아직 없어요/);
  assert.doesNotMatch(html, /💻|🧩/);
});

test("대분류는 행 오른쪽 중립 칩으로 남고, 매칭이 없으면 표시 전용 [기타] 를 쓴다", () => {
  // "AI" 는 topic 이름과 정확히 맞아 테크·IT → 실제 분류명이 붙는다.
  assert.match(html, /bg-secondary[^>]*>테크·IT</);
  /*
    나머지 5건은 어디에도 안 걸린 가상 [기타] 버킷이다. 칩을 생략했더니 빈 자리가 줄줄이 남아
    열이 비뚤어 보여(2026-08-13) fallback 문구를 표시한다 — **모든 행에 칩이 있다.**
  */
  assert.equal(html.split(/bg-secondary[^>]*>기타</).length - 1, 5);
  assert.equal(html.split("bg-secondary").length - 1, 6);
  // 표시 전용이라는 근거: 컴포넌트에서만 만들고 분류 lib 는 이 문구를 모른다.
  assert.match(mindSource, /const ETC_FALLBACK_LABEL = "기타";/);
  assert.doesNotMatch(
    code(readFileSync(new URL("../lib/interest-category.ts", import.meta.url), "utf8")),
    /ETC_FALLBACK_LABEL/,
  );
  // 오렌지 강조 칩이 아니다(중립 배경 + 흐린 글자).
  assert.match(mindSource, /bg-secondary px-1\.5 py-px[^"]*text-muted-foreground/);
});

test("구역 제목은 보조 문구가 아니라 제목으로 읽히고, 오른쪽을 선으로 채운다", () => {
  // 관심사 이름(13px)보다 크고 진하다 — 흐린 muted 보조 문구로 두지 않는다.
  assert.match(mindSource, /text-\[13\.5px\] font-bold[^"]*text-foreground/);
  assert.doesNotMatch(mindSource, /text-\[11\.5px\][^"]*text-muted-foreground/);
  // 구분선은 하이픈 문자가 아니라 border 다. 남는 폭만 채우고 카드 밖으로 넘치지 않는다.
  assert.match(mindSource, /min-w-0 flex-1 border-t border-border/);
  assert.doesNotMatch(html, /─|-{3,}/);
  // 접근성 구조(h3 + section aria-label)는 그대로다.
  assert.match(html, /<h3[^>]*>직접 추가<\/h3>/);
  assert.match(html, /<section aria-label="AI 발견"/);
});

test("직접 추가한 관심사가 먼저, 그다음 AI 추정이 점수 내림차순으로 놓인다", () => {
  const order = [...html.matchAll(/truncate text-\[13px\][^>]*>([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(order, [
    // ① USER 2건 — GET /api/interests 응답 순서 그대로(점수 1 인 AI 도 관심도로 줄 세우지 않는다).
    "AI",
    "등산",
    // ② AI 추정 — 0.6 · 0.3 · 0.05 · 0 내림차순.
    "환율",
    "노트북",
    LONG_NAME,
    "반도체",
  ]);
});
