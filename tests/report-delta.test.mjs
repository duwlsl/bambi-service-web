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
 * 으로 쪼개지 않고 **실제 컴포넌트가 만드는 HTML** 을 그대로 검증한다.
 *
 * ## 이 파일이 지키는 계약
 *
 * 보고서 상세 API 의 `body` 는 **서버가 완성한 Markdown 원문**이다. 프론트는 문장·목록·헤더를
 * 재조합하지 않고, 본문 헤더를 읽어 델타 여부·섹션 역할을 추측하지 않는다. 렌더링 분기는
 * 최상위 응답의 `changeHistoryEnabled` 하나뿐이고, delta 일 때 하는 일은
 *   (1) `.md-delta` variant 컨테이너를 붙이는 것
 *   (2) GFM 취소선 `~~…~~` → `<del>` 을 인라인 문법으로 추가 해석하는 것
 * 두 가지뿐이다. 나머지 델타 표현은 CSS(globals.css) 가 렌더된 요소에 입힌다.
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

/** 블록 구조만 뽑은 개요 — 여는 태그 순서열. 구조·순서 보존을 텍스트와 분리해 비교할 때 쓴다. */
function outline(html) {
  return html.match(/<(?:h[2-6]|p|ul|ol|li|blockquote|table|pre)\b[^>]*>/g) ?? [];
}

/** heading 텍스트를 등장 순서대로 뽑는다(원문 순서 보존 확인용). */
function headings(html) {
  return [...html.matchAll(/<(h[2-6])[^>]*>(.*?)<\/\1>/g)].map((m) => `${m[1]}:${m[2]}`);
}

/**
 * delta 출력을 non-delta 와 비교 가능한 형태로 되돌린다 —
 * variant 클래스를 떼고 `<del>x</del>` 를 원문 `~~x~~` 로 복원한다.
 * 이 둘 말고 차이가 남으면 파서가 델타에서 내용을 손댔다는 뜻이다.
 */
function undeltaify(html) {
  return html
    .replace('<div class="md-viewer md-delta">', '<div class="md-viewer">')
    .replace(/<del>(.*?)<\/del>/g, "~~$1~~");
}

/* ── 픽스처: 서버가 내려주는 실제 본문 형태 ──────────────────────────
   agent 가 완성해 보내는 Markdown 이다. 프론트는 이 문자열을 그대로 렌더러에 넘긴다.
   ────────────────────────────────────────────────────────────────── */

/** 단일 주제 — `## 변경사항 → ## 내용 → ## 시사점 → ## 타임라인`. */
const SINGLE_TOPIC = `## 변경사항

### 변경된 사실 (2건)

- 목표 시점이 ~~2026-2Q~~ 에서 \`2026-4Q\` 로 밀렸다
- 담당이 ~~A팀~~ 에서 \`B팀\` 으로 바뀌었다

### 새롭게 확인된 사실 (1건)

- 신규 파트너 \`3곳\` 이 확정됐다 [L1]

## 내용

본문 문단이다. **핵심**은 이것이다.

## 시사점

- 눈여겨볼 것

## 타임라인

- 2026-08-10 최초 확인
- 2026-08-12 갱신`;

/** 단일 주제 — 타임라인 섹션이 없는 본문(섹션 유무로 렌더링이 달라지지 않아야 한다). */
const SINGLE_TOPIC_NO_TIMELINE = `## 변경사항

### 변경된 사실 (1건)

- 목표 시점이 ~~2026-2Q~~ 에서 \`2026-4Q\` 로 밀렸다

## 내용

본문 문단이다.

## 시사점

- 눈여겨볼 것`;

/** 다중 주제 — `## 주제명 → ### 변경사항 → #### …` 3단 중첩. */
const MULTI_TOPIC = `## 반도체

### 변경사항

#### 변경된 사실 (1건)

- 단가가 ~~1,200원~~ 에서 \`1,450원\` 으로 올랐다

#### 새롭게 확인된 사실 (1건)

- 신규 라인 \`2개\` 착공

### 내용

- 본문 항목

## 이차전지

### 변경사항

#### 변경된 사실 (1건)

- 수율이 ~~82%~~ 에서 \`88%\` 로 올랐다

### 타임라인

- 2026-08-12 갱신`;

/** 델타처럼 보이는 헤더가 하나도 없는 본문 — 분기가 헤더와 무관함을 보이는 데 쓴다. */
const NO_DELTA_HEADERS = `## 오늘의 정리

- 값이 ~~옛것~~ 에서 \`새것\` 으로 바뀌었다

일반 문단이다.`;

/* ── 1. 렌더링 분기 = changeHistoryEnabled 하나뿐 ────────────────── */

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

test("delta=false 는 델타 스코프·<del> 을 전혀 만들지 않는다(기존 렌더링 유지)", () => {
  const html = render(SINGLE_TOPIC, false);
  assert.equal(html.includes("md-delta"), false);
  assert.equal(html.includes("<del>"), false);
  assert.equal(html.includes("~~2026-2Q~~"), true); // 기존처럼 원문 텍스트로 남는다
  assert.equal(html.startsWith('<div class="md-viewer">'), true);
});

test("delta=true 면 md-delta variant 컨테이너가 붙는다", () => {
  assert.equal(render(SINGLE_TOPIC, true).startsWith('<div class="md-viewer md-delta">'), true);
});

test("분기는 본문 헤더가 아니라 플래그만 본다 — 델타 헤더가 있어도 false 면 일반 렌더링", () => {
  // `## 변경사항`·`### 변경된 사실` 이 있어도 changeHistoryEnabled=false 면 델타 처리가 없어야 한다.
  const html = render(SINGLE_TOPIC, false);
  assert.equal(html.includes("md-delta"), false);
  assert.equal(html.includes("<del>"), false);
});

test("분기는 본문 헤더가 아니라 플래그만 본다 — 델타 헤더가 없어도 true 면 델타 렌더링", () => {
  const html = render(NO_DELTA_HEADERS, true);
  assert.equal(html.startsWith('<div class="md-viewer md-delta">'), true);
  assert.match(html, /<del>옛것<\/del>/);
  assert.match(html, /<code>새것<\/code>/);
});

test("헤더 문구가 바뀌어도 출력 구조는 그대로다(문구 정확일치 판정이 남아 있지 않다)", () => {
  // agent 가 섹션 문구를 바꿔도 조용히 깨지지 않아야 한다 — 문구는 텍스트일 뿐 판정 근거가 아니다.
  const renamed = SINGLE_TOPIC.replace("## 변경사항", "## 달라진 점")
    .replace("### 변경된 사실 (2건)", "### 갱신된 사실 두 건")
    .replace("### 새롭게 확인된 사실 (1건)", "### 신규 사실")
    .replace("## 시사점", "## 주목할 점");
  assert.deepEqual(outline(render(renamed, true)), outline(render(SINGLE_TOPIC, true)));
});

test("본문 헤더에서 유래한 역할 클래스가 어디에도 남아 있지 않다", () => {
  for (const md of [SINGLE_TOPIC, MULTI_TOPIC, SINGLE_TOPIC_NO_TIMELINE]) {
    const html = render(md, true);
    // 섹션/갱신/신규 배지·목록 재구성·비교 줄·백틱 값 문맥 — 전부 제거된 판정 산물이다.
    assert.equal(/md-delta-(section|changed|fresh|list|comparison|line|before|after|value)/.test(html), false);
    assert.equal(html.includes("md-cont"), false);
    // 컨테이너 말고는 클래스를 붙이지 않는다(blockquote 내부 last:mb-0 은 기존 규칙).
    assert.equal(/<(?:h[2-6]|ul|ol|li|code|del|b)\s+class=/.test(html), false);
  }
});

/* ── 2. body 원문 무변형 ────────────────────────────────────────── */

test("delta 는 구조를 바꾸지 않는다 — variant 와 <del> 말고 non-delta 와 동일한 HTML", () => {
  // 이 동일성이 깨지면 델타 경로가 문장·목록·헤더를 재조합했다는 뜻이다.
  // (heading depth 2·3 만 쓰는 픽스처라 headingTag 의 non-delta 접기와도 어긋나지 않는다)
  for (const md of [SINGLE_TOPIC, SINGLE_TOPIC_NO_TIMELINE]) {
    assert.equal(undeltaify(render(md, true)), render(md, false));
  }
});

test("delta 여부와 무관하게 블록 개요(구조·순서)가 같다", () => {
  for (const md of [SINGLE_TOPIC, SINGLE_TOPIC_NO_TIMELINE, NO_DELTA_HEADERS]) {
    assert.deepEqual(outline(render(md, true)), outline(render(md, false)));
  }
});

test("들여쓴 비-불릿 줄을 목록으로 만들지 않는다(목록 생성 금지)", () => {
  // 예전 델타 파서는 `  (기존) …` / `  (변경) …` 두 줄을 <ul><li> 로 합성했다.
  const md = "## 변경사항\n\n  (기존) 옛 문장\n  (변경) 새 문장\n";
  const html = render(md, true);
  assert.equal(html.includes("<ul>"), false);
  assert.equal(html.includes("<li>"), false);
  // Markdown soft break 기본 의미대로 한 문단이다(delta·non-delta 동일).
  assert.match(html, /<p>\(기존\) 옛 문장 \(변경\) 새 문장<\/p>/);
  assert.deepEqual(outline(html), outline(render(md, false)));
});

test("빈 줄로 나뉜 목록은 원문대로 나뉘어 있는다(목록 병합 금지)", () => {
  const md = "- 첫 항목\n\n- 둘째 항목";
  for (const delta of [false, true]) {
    const html = render(md, delta);
    assert.equal((html.match(/<ul>/g) ?? []).length, 2);
  }
});

test("들여쓴 연속 줄을 직전 목록 항목에 흡수하지 않는다", () => {
  const md = "## 변경사항\n\n- 항목 하나\n  덧붙인 줄\n";
  const html = render(md, true);
  assert.match(html, /<ul><li>항목 하나<\/li><\/ul>/);
  assert.match(html, /<p>덧붙인 줄<\/p>/);
  assert.deepEqual(outline(html), outline(render(md, false)));
});

/* ── 3. 구조·순서 보존 ─────────────────────────────────────────── */

test("단일 주제: 섹션 순서(변경사항 → 내용 → 시사점 → 타임라인)를 원문 그대로 유지한다", () => {
  assert.deepEqual(headings(render(SINGLE_TOPIC, true)), [
    "h2:변경사항",
    "h3:변경된 사실 (2건)",
    "h3:새롭게 확인된 사실 (1건)",
    "h2:내용",
    "h2:시사점",
    "h2:타임라인",
  ]);
});

test("타임라인 섹션이 없는 본문도 나머지 순서가 그대로다(없는 섹션을 만들지 않는다)", () => {
  assert.deepEqual(headings(render(SINGLE_TOPIC_NO_TIMELINE, true)), [
    "h2:변경사항",
    "h3:변경된 사실 (1건)",
    "h2:내용",
    "h2:시사점",
  ]);
});

test("다중 주제: `## 주제명` → `### 변경사항` → `#### …` 3단 깊이·순서를 보존한다", () => {
  assert.deepEqual(headings(render(MULTI_TOPIC, true)), [
    "h2:반도체",
    "h3:변경사항",
    "h4:변경된 사실 (1건)",
    "h4:새롭게 확인된 사실 (1건)",
    "h3:내용",
    "h2:이차전지",
    "h3:변경사항",
    "h4:변경된 사실 (1건)",
    "h3:타임라인",
  ]);
});

test("다중 주제: 주제 헤더와 섹션 헤더가 같은 태그로 평탄화되지 않는다", () => {
  const html = render(MULTI_TOPIC, true);
  assert.equal(/<h2[^>]*>변경사항<\/h2>/.test(html), false);
  assert.equal(/<h3[^>]*>변경된 사실/.test(html), false);
});

test("#####·###### 도 h5·h6 까지 보존하고 그 이하는 h6 으로 고정한다", () => {
  const html = render("## a\n### b\n#### c\n##### d\n###### e\n", true);
  assert.match(html, /<h5[^>]*>d<\/h5>/);
  assert.match(html, /<h6[^>]*>e<\/h6>/);
});

test("다중 주제에서 delta 와 non-delta 차이는 heading 깊이 접기와 <del> 뿐이다", () => {
  // non-delta 는 예전대로 ### 이상을 h3 로 접는다(기존 화면 회귀 방지). 그 외 블록은 동일해야 한다.
  const deltaHtml = undeltaify(render(MULTI_TOPIC, true)).replace(/<(\/?)h4>/g, "<$1h3>");
  assert.equal(deltaHtml, render(MULTI_TOPIC, false));
});

test("목록의 항목 수·중첩·순서를 원문 그대로 유지한다", () => {
  const md = "## s\n\n- 첫째\n  - 하위 1\n  - 하위 2\n- 둘째\n- 셋째\n";
  for (const delta of [false, true]) {
    const html = render(md, delta);
    assert.match(
      html,
      /<ul><li>첫째<ul><li>하위 1<\/li><li>하위 2<\/li><\/ul><\/li><li>둘째<\/li><li>셋째<\/li><\/ul>/,
    );
  }
});

/* ── 4. Markdown 표현 (취소선 · 인라인 코드 · 굵은 글씨) ─────────── */

test("취소선: delta 에서 ~~기존 값~~ 은 <del> 로 렌더되고 화면에 ~~ 가 남지 않는다", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /<del>2026-2Q<\/del>/);
  assert.match(html, /<del>A팀<\/del>/);
  assert.equal(html.includes("~~"), false);
});

test("인라인 코드: `변경 값` 은 <code> 로 렌더된다(문맥 클래스 없음)", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /<code>2026-4Q<\/code>/);
  assert.match(html, /<code>B팀<\/code>/);
  assert.match(html, /<code>3곳<\/code>/);
});

test("굵은 글씨: **핵심** 은 <b> 로 렌더된다", () => {
  assert.match(render(SINGLE_TOPIC, true), /<b>핵심<\/b>/);
});

test("한 줄에 취소선·인라인 코드·굵게·링크가 섞여도 각각 그대로 렌더된다", () => {
  const html = render(
    "## s\n- **굵게** ~~옛값~~ `새값` [링크](https://example.com) 끝",
    true,
  );
  assert.match(html, /<b>굵게<\/b>/);
  assert.match(html, /<del>옛값<\/del>/);
  assert.match(html, /<code>새값<\/code>/);
  assert.match(
    html,
    /<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">링크<\/a>/,
  );
  assert.match(html, /끝/);
});

test("인용 참조([L1])는 링크가 아니라 본문 텍스트로 남는다(계약 표기 유지)", () => {
  const html = render(SINGLE_TOPIC, true);
  assert.match(html, /\[L1\]/);
  assert.equal(html.includes('href="L1"'), false);
});

test("취소선은 delta 전용 — 기존 본문의 ~~ 는 예전처럼 원문 텍스트다", () => {
  const html = render(SINGLE_TOPIC, false);
  assert.equal(html.includes("<del>"), false);
  assert.match(html, /~~2026-2Q~~/);
});

/* ── 5. 공용 Markdown 렌더러 회귀 ───────────────────────────────── */

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

test("표·인용·코드펜스가 delta 에서도 블록 구조를 그대로 유지한다", () => {
  const md = "## s\n\n> 인용 ~~옛값~~\n\n| A | B |\n|---|---|\n| 1 | 2 |\n";
  assert.deepEqual(outline(render(md, true)), outline(render(md, false)));
  assert.match(render(md, true), /<blockquote><p class="last:mb-0">인용 <del>옛값<\/del><\/p>/);
});
