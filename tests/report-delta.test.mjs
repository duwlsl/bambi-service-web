import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * 변경점(Delta) 렌더링 회귀 테스트.
 *
 * tests/report-pending.test.mjs 의 "TS 를 직접 트랜스파일해 vm 에서 실행" 패턴을 그대로 쓰되,
 * 대상이 TSX 라 jsx 변환을 켜고 react/jsx-runtime 만 실제 모듈로 넘긴다. 프로덕션 코드를 테스트용
 * 으로 쪼개지 않고 **실제 컴포넌트가 만드는 HTML** 을 그대로 검증한다(파서·클래스·태그 동시 확인).
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

const { ReportMarkdown } = loadTsModule("../components/report/report-markdown.tsx", (id) => {
  if (id === "react/jsx-runtime") return nodeRequire("react/jsx-runtime");
  if (id === "react") return nodeRequire("react");
  throw new Error(`unexpected require: ${id}`);
});

const { isDeltaReport } = loadTsModule("../lib/report-delta.ts");

/** 실제 컴포넌트가 만드는 HTML 문자열. delta 를 안 넘기면 기본값(false)이 쓰인다. */
function render(markdown, delta) {
  return renderToStaticMarkup(ReportMarkdown({ markdown, delta }));
}

/* ── 단일 주제 / 다주제 실제 본문 형태 ─────────────────────────────── */

const SINGLE_TOPIC = `## 이번에 달라진 점
### 달라진 사실
- 목표 시점이 ~~2026-2Q~~ 에서 \`2026-4Q\` 로 밀렸다
### 새로 확인된 사실
- 신규 파트너 \`3곳\` 이 확정됐다
## 보고서 내용
- 일반 항목 \`값\` 하나
## 주목할 점
- 눈여겨볼 것`;

const MULTI_TOPIC = `## 반도체
### 이번에 달라진 점
#### 달라진 사실
- 단가가 ~~1,200원~~ 에서 \`1,450원\` 으로 올랐다
#### 새로 확인된 사실
- 신규 라인 \`2개\` 착공
### 보고서 내용
- 본문 항목`;

/* ── 1. 렌더링 분기 ─────────────────────────────────────────────── */

test("판정은 보고서 응답의 changeHistoryEnabled=true 일 때만 델타다", () => {
  assert.equal(isDeltaReport({ changeHistoryEnabled: true }), true);
  assert.equal(isDeltaReport({ changeHistoryEnabled: false }), false);
});

test("필드가 없는 레거시 응답·null·계약 밖 값은 전부 기존 렌더링(false)", () => {
  assert.equal(isDeltaReport({}), false); // 필드 누락(구버전 배포본)
  assert.equal(isDeltaReport({ changeHistoryEnabled: undefined }), false);
  assert.equal(isDeltaReport({ changeHistoryEnabled: null }), false);
  assert.equal(isDeltaReport({ changeHistoryEnabled: "true" }), false); // 문자열은 계약 밖
  assert.equal(isDeltaReport(null), false);
  assert.equal(isDeltaReport(undefined), false);
});

test("판정은 계정 설정(/api/auth/me)이 아니라 보고서 응답값만 본다", () => {
  // 계정 설정이 켜져 있어도(me.changeHistoryEnabled=true) 보고서가 false 면 기존 렌더링이어야 한다.
  const legacyReport = { changeHistoryEnabled: false };
  const meSettings = { changeHistoryEnabled: true };
  assert.equal(isDeltaReport(legacyReport), false);
  // 판정 함수는 보고서만 받는다 — 설정 객체를 넣어도 보고서 값과 무관하게 섞이지 않는다.
  assert.equal(isDeltaReport(legacyReport) === isDeltaReport(meSettings), false);
});

test("delta=false 와 필드 누락(기본값)은 완전히 같은 HTML 을 만든다", () => {
  assert.equal(render(SINGLE_TOPIC, false), render(SINGLE_TOPIC, undefined));
});

test("delta=false 는 델타 클래스·<del> 을 전혀 만들지 않는다(기존 렌더링 유지)", () => {
  const html = render(SINGLE_TOPIC, false);
  assert.equal(html.includes("md-delta"), false);
  assert.equal(html.includes("<del>"), false);
  assert.equal(html.includes("~~2026-2Q~~"), true); // 기존처럼 원문 텍스트로 남는다
  assert.equal(html.startsWith('<div class="md-viewer">'), true);
});

test("delta=true 면 md-delta 스코프가 붙는다", () => {
  assert.equal(render(SINGLE_TOPIC, true).startsWith('<div class="md-viewer md-delta">'), true);
});

/* ── 2. heading depth 보존 ──────────────────────────────────────── */

test("단일 주제: h2 → h3 depth 를 보존한다", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /<h2[^>]*>이번에 달라진 점<\/h2>/);
  assert.match(html, /<h3[^>]*>달라진 사실<\/h3>/);
  assert.match(html, /<h3[^>]*>새로 확인된 사실<\/h3>/);
});

test("다주제: h2 → h3 → h4 depth 를 보존한다", () => {
  const html = render(MULTI_TOPIC, true);
  assert.match(html, /<h2[^>]*>반도체<\/h2>/);
  assert.match(html, /<h3[^>]*>이번에 달라진 점<\/h3>/);
  assert.match(html, /<h4[^>]*>달라진 사실<\/h4>/);
  assert.match(html, /<h4[^>]*>새로 확인된 사실<\/h4>/);
});

test("다주제의 섹션 헤더와 최심 소제목이 같은 태그로 평탄화되지 않는다", () => {
  const html = render(MULTI_TOPIC, true);
  // 섹션은 h3, 소제목은 h4 — 둘 다 h3 로 접히던 기존 동작이 재현되면 실패한다.
  assert.equal(/<h3[^>]*>달라진 사실<\/h3>/.test(html), false);
  assert.equal(/<h4[^>]*>이번에 달라진 점<\/h4>/.test(html), false);
});

test("#####·###### 도 h5·h6 까지 보존하고 그 이하는 h6 으로 고정한다", () => {
  const html = render("## a\n### b\n#### c\n##### d\n###### e\n", true);
  assert.match(html, /<h5[^>]*>d<\/h5>/);
  assert.match(html, /<h6[^>]*>e<\/h6>/);
});

/* ── 3. 배지 판정 (구조 먼저 → 정확 일치) ───────────────────────── */

test("단일 주제: 최심 소제목 '달라진 사실' → changed, '새로 확인된 사실' → fresh", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /<h3 class="md-delta-changed">달라진 사실<\/h3>/);
  assert.match(html, /<h3 class="md-delta-fresh">새로 확인된 사실<\/h3>/);
});

test("다주제: 최심 소제목에서도 동일하게 changed·fresh 판정", () => {
  const html = render(MULTI_TOPIC, true);
  assert.match(html, /<h4 class="md-delta-changed">달라진 사실<\/h4>/);
  assert.match(html, /<h4 class="md-delta-fresh">새로 확인된 사실<\/h4>/);
});

test("'이번에 달라진 점' 은 섹션 헤더일 뿐 changed 배지를 받지 않는다", () => {
  const single = render(SINGLE_TOPIC, true);
  assert.match(single, /<h2 class="md-delta-section">이번에 달라진 점<\/h2>/);
  assert.equal(/class="md-delta-changed">이번에 달라진 점/.test(single), false);

  const multi = render(MULTI_TOPIC, true);
  assert.match(multi, /<h3 class="md-delta-section">이번에 달라진 점<\/h3>/);
  assert.equal(/class="md-delta-changed">이번에 달라진 점/.test(multi), false);
});

test("'보고서 내용'·'주목할 점' 은 fresh 배지를 받지 않는다(else 기본값 없음)", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.equal(/class="md-delta-fresh">보고서 내용/.test(html), false);
  assert.equal(/class="md-delta-fresh">주목할 점/.test(html), false);
  assert.equal(/class="md-delta-changed">보고서 내용/.test(html), false);
});

test("부분 일치 제목('달라진 사실 안내')과 알 수 없는 제목은 배지가 없다", () => {
  const html = render("## 이번에 달라진 점\n### 달라진 사실 안내\n### 기타 소식\n- x", true);
  assert.match(html, /<h3>달라진 사실 안내<\/h3>/); // 클래스 없음
  assert.match(html, /<h3>기타 소식<\/h3>/);
  assert.equal(html.includes("md-delta-changed"), false);
  assert.equal(html.includes("md-delta-fresh"), false);
});

test("다주제의 주제명(h2)은 섹션 스타일을 받지 않는다(태그명 기반 판정 아님)", () => {
  const html = render(MULTI_TOPIC, true);
  assert.match(html, /<h2>반도체<\/h2>/); // 클래스 없음
  assert.equal(/<h2 class="md-delta-section">/.test(html), false);
});

/* ── 4. 취소선 ──────────────────────────────────────────────────── */

test("delta 에서 ~~값~~ 은 <del> 로 렌더되고 화면에 ~~ 가 남지 않는다", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /<del>2026-2Q<\/del>/);
  assert.equal(html.includes("~~"), false);
});

test("취소선이 링크·강조·백틱 등 기존 인라인 파싱을 깨지 않는다", () => {
  const html = render(
    "## s\n### 달라진 사실\n- **굵게** ~~옛값~~ `새값` [링크](https://example.com) 끝",
    true,
  );
  assert.match(html, /<b>굵게<\/b>/);
  assert.match(html, /<del>옛값<\/del>/);
  assert.match(html, /<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">링크<\/a>/);
  assert.match(html, /끝/);
});

/* ── 5. (기존)/(변경) 목록 결합 ─────────────────────────────────── */

test("들여쓴 (변경) 줄이 직전 (기존) 목록 항목에 결합된다", () => {
  const html = render("## s\n### 달라진 사실\n- (기존) 기존 내용\n  (변경) 변경된 내용", true);
  // 같은 <li> 안에 두 줄이 모두 있어야 한다(별도 <p> 문단으로 떨어지면 실패).
  assert.match(html, /<li>\(기존\) 기존 내용<span class="md-cont">\(변경\) 변경된 내용<\/span><\/li>/);
  assert.equal(html.includes("<p>(변경)"), false);
});

test("결합은 delta 에서만 — 기존 렌더링에서는 지금처럼 별도 문단으로 남는다", () => {
  const html = render("- (기존) 기존 내용\n  (변경) 변경된 내용", false);
  assert.equal(html.includes("md-cont"), false);
  assert.match(html, /<p>\(변경\) 변경된 내용<\/p>/);
});

test("일반 문단·다음 목록·하위 불릿을 잘못 삼키지 않는다", () => {
  const html = render(
    "## s\n### 달라진 사실\n- 첫 항목\n  - 하위 불릿\n- 둘째 항목\n\n들여쓰지 않은 문단",
    true,
  );
  assert.match(html, /<ul><li>하위 불릿<\/li><\/ul>/); // 하위 불릿은 그대로 중첩 목록
  assert.match(html, /<p>들여쓰지 않은 문단<\/p>/); // 문단은 결합되지 않음
  assert.equal(html.includes("md-cont"), false);
});

test("들여쓴 제목·표·인용은 연속 행으로 삼키지 않는다", () => {
  const html = render("## s\n### 달라진 사실\n- 항목\n  ## 들여쓴 제목", true);
  assert.equal(html.includes('<span class="md-cont">## 들여쓴 제목'), false);
});

/* ── 6. 백틱 값 문맥 ────────────────────────────────────────────── */

test("changed 소제목 아래 백틱 값은 changed 클래스를 받는다", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /<code class="md-delta-value-changed">2026-4Q<\/code>/);
});

test("fresh 소제목 아래 백틱 값은 fresh 클래스를 받는다", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /<code class="md-delta-value-fresh">3곳<\/code>/);
});

test("문맥 밖(보고서 내용 등) 백틱은 기존 스타일 그대로 클래스가 없다", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /<code>값<\/code>/);
});

test("다주제에서도 백틱 문맥이 동일하게 갈린다", () => {
  const html = render(MULTI_TOPIC, true);
  assert.match(html, /<code class="md-delta-value-changed">1,450원<\/code>/);
  assert.match(html, /<code class="md-delta-value-fresh">2개<\/code>/);
});

test("delta=false 면 모든 백틱이 기존 스타일(클래스 없음)", () => {
  const html = render(SINGLE_TOPIC, false);
  assert.equal(html.includes("md-delta-value"), false);
  assert.match(html, /<code>2026-4Q<\/code>/);
});

/* ── 7. 기존 Markdown 회귀 ──────────────────────────────────────── */

test("링크·강조·목록·인용·표·코드펜스가 기존대로 렌더된다(delta 무관)", () => {
  const md = [
    "## 제목",
    "본문 **굵게** 와 `코드` 와 [링크](https://example.com).",
    "- 항목 1",
    "- 항목 2",
    "  - 하위",
    "1. 순서 1",
    "> 인용문",
    "| A | B |",
    "|---|---|",
    "| 1 | 2 |",
    "```",
    "code line",
    "```",
  ].join("\n");
  for (const delta of [false, true]) {
    const html = render(md, delta);
    assert.match(html, /<b>굵게<\/b>/);
    assert.match(html, /<a href="https:\/\/example\.com"/);
    assert.match(html, /<li>항목 1<\/li>/);
    assert.match(html, /<ul><li>하위<\/li><\/ul>/);
    assert.match(html, /<ol><li>순서 1<\/li><\/ol>/);
    assert.match(html, /<blockquote>/);
    assert.match(html, /<th>A<\/th>/);
    assert.match(html, /<td>1<\/td>/);
    assert.match(html, /<pre class="code">code line<\/pre>/);
  }
});

test("http/https 외 스킴은 여전히 링크로 만들지 않는다(보안 정책 유지)", () => {
  for (const delta of [false, true]) {
    const html = render("[클릭](javascript:alert(1))", delta);
    assert.equal(html.includes("<a"), false);
    assert.equal(html.includes("javascript:alert(1)"), true); // 원문 텍스트로 남는다
  }
});

test("본문 HTML 태그는 실행되지 않고 문자 그대로 이스케이프된다", () => {
  for (const delta of [false, true]) {
    const html = render("<script>alert(1)</script>", delta);
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&lt;script&gt;/);
  }
});
