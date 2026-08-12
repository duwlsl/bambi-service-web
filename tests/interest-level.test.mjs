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
    // "AI" 는 태그와 겹치는 직접 등록 항목(점수 유지 + 배지), "등산" 은 점수 없는 직접 등록 항목.
    myInterests: [interest(1, "AI"), interest(2, "등산")],
  }),
);

test("점수 크기에 따라 라벨과 막대 색이 함께 갈린다", () => {
  for (const label of ["매우 높음", "높음", "보통", "낮음"]) {
    assert.ok(html.includes(label), `${label} 라벨이 없다`);
  }
  for (const className of Object.values(INTEREST_LEVEL_BAR_CLASS)) {
    assert.ok(html.includes(className), `${className} 막대가 없다`);
  }
  // 막대 길이는 실제 값 그대로(1 → 100%, 0.6 → 60%, 0.3 → 30%).
  for (const width of ["width:100%", "width:60%", "width:30%"]) {
    assert.ok(html.includes(width), `${width} 막대가 없다`);
  }
});

test("점수 0 은 막대와 최하 라벨을 갖고, 점수 없음은 막대 없이 안내 문구를 갖는다", () => {
  // 0 → 최소 폭 막대 + "낮음". (막대가 아예 없으면 값이 없는 항목과 구별되지 않는다)
  assert.ok(html.includes("width:8%"));
  assert.ok(html.includes("낮음"));
  // 점수 없음 → 막대·색·등급 없음 + 직접 추가 사실 + 관심도 정보 없음.
  assert.ok(html.includes("직접 추가한 관심사"));
  assert.ok(html.includes("관심도 정보 없음"));
  // 점수 없는 행이 라벨 칸을 비워 정렬을 무너뜨리지 않는다(같은 폭의 자리에 — 를 남긴다).
  assert.ok(html.includes("—"));
});

test("직접 등록한 항목에만 출처 배지가 붙고, AI 추정 문구는 반복하지 않는다", () => {
  // 내 관심사 2건(AI·등산) → 배지 2개. 나머지 AI 추정 항목에는 붙지 않는다.
  assert.equal(html.split("내 관심사").length - 1, 2);
  // "AI 추정"은 섹션 안내 한 줄에서만 말한다 — 행마다 반복하던 표기는 남기지 않는다.
  assert.equal(html.split("AI 추정").length - 1, 1);
  assert.doesNotMatch(mindCode, /item\.source === "USER" \? "내 관심사" : "AI 추정"/);
});

test("긴 이름은 말줄임으로 처리해 다른 칸을 밀어내지 않는다", () => {
  assert.ok(html.includes(LONG_NAME.slice(0, 12)));
  assert.match(mindSource, /min-w-0 truncate text-\[13px\]/);
  // 관심도 라벨 칸은 고정폭 + 줄바꿈 금지 → 이름 길이와 무관하게 오른쪽 정렬이 유지된다.
  assert.match(mindSource, /w-14 shrink-0 text-right text-\[11\.5px\] whitespace-nowrap/);
});

test("좁은 화면에서는 막대를 아래 줄 전체 폭으로 내린다", () => {
  // 이름 옆 배지가 1줄 고정폭 합을 늘리므로 한 줄 배치 분기점이 480px 이다(그 아래는 2줄).
  assert.match(mindSource, /order-last w-full/);
  assert.match(mindSource, /min-\[480px\]:order-none/);
  assert.doesNotMatch(mindCode, /min-\[360px\]/);
});

test("그룹 구조와 정렬은 그대로 둔다", () => {
  // 대분류 묶기·빈 대분류 감추기·강도 내림차순은 이번 변경 대상이 아니다.
  assert.match(mindSource, /const SHOW_EMPTY_CATEGORIES = false;/);
  assert.match(mindSource, /groupInterestsByCategory\(taxonomy\.data, wikiTags, myInterests\)/);
  assert.ok(html.includes("테크·IT"));
  assert.ok(html.includes("기타"));
});
