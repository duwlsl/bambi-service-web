import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

/**
 * 본인 소유 PRIVATE 보고서 보관(스크랩) 회귀 테스트.
 *
 * tests/morning-report-visibility.test.mjs 와 같은 "TS 를 직접 트랜스파일해 vm 에서 실행" 패턴이다.
 * 검증 대상은 세 층이다:
 *   1. 노출 판정 입력 — lib/adapters/card.ts 의 isPublicCard · isCardOwner · toScrapped (실제 실행)
 *   2. 토글 진입점 — hooks/use-card-scrap.ts 의 toggle() (React 최소 stub 으로 순수 로직만 실행)
 *   3. 화면 조건 — card-detail-screen.tsx 의 JSX 게이트 (소스 수준 회귀)
 *
 * 서버 계약(service-api #85)이 전제다: 본인 소유 PRIVATE 는 스크랩 생성·해제가 되고
 * `GET /api/scraps` 에도 포함된다. 남의 PRIVATE 는 여전히 404 라 상세까지 오지 못한다.
 * 따라서 여기서 검증하는 것은 **프론트가 버튼을 올바른 카드에만 내놓는가**다.
 */
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

/**
 * `@/...` 별칭을 실제 파일로 이어 주는 최소 resolver. 어댑터가 기대는 **진짜 부품**을 그대로
 * 싣기 위한 것이라 판정 로직을 흉내 내지 않는다(타입 전용 import 는 트랜스파일에서 지워진다).
 * node_modules 패키지는 `cn()` 의 스타일 병합에만 쓰이고 이 테스트가 부르지 않으므로 stub 이다.
 */
const APP_MODULES = {
  "@/lib/normalize": "../lib/normalize.ts",
  "@/lib/report-type": "../lib/report-type.ts",
  "@/lib/utils": "../lib/utils.ts",
  "@/lib/adapters/report": "../lib/adapters/report.ts",
  "@/lib/adapters/card": "../lib/adapters/card.ts",
  "@/hooks/use-card-scrap": "../hooks/use-card-scrap.ts",
};

function requireApp(id) {
  if (id === "clsx") return { clsx: () => "" };
  if (id === "tailwind-merge") return { twMerge: () => "" };
  const path = APP_MODULES[id];
  if (path === undefined) throw new Error(`unexpected require: ${id}`);
  return loadTsModule(path, requireApp);
}

const { isCardOwner, isPublicCard, toScrapped } = requireApp("@/lib/adapters/card");

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

/**
 * 상세 화면이 쓰는 카드 모양(판정에 필요한 필드만).
 * `scrapped` 는 기본값으로 덮지 않는다 — 명시적 `undefined`(= 필드 미배포 응답)와 생략을
 * 구분해야 "값을 모르는 카드" 경로가 실제로 검증된다.
 */
function card(options) {
  const { visibility, authorPublicId = ME } = options;
  return {
    publicId: "33333333-3333-4333-8333-333333333333",
    visibility,
    author: authorPublicId === null ? null : { publicId: authorPublicId },
    scrapped: "scrapped" in options ? options.scrapped : false,
  };
}

/**
 * 상세 화면(card-detail-screen.tsx)의 보관 버튼 노출 조건을 **같은 부품으로** 재현한다.
 * 아래 3번 블록이 화면 소스에 이 조건이 그대로 있는지 확인하므로 둘이 갈라질 수 없다.
 */
function scrapButtonShown(cardResponse, viewerPublicId) {
  const isPublic = isPublicCard(cardResponse);
  const owner = isCardOwner(cardResponse, viewerPublicId);
  const scrapped = toScrapped(cardResponse.scrapped);
  return (isPublic || owner) && scrapped !== null;
}

/* ── 1. 노출 판정 진리표 ────────────────────────────────────────── */

test("본인 PRIVATE: 유효한 scrapped 상태면 보관 버튼이 노출된다", () => {
  assert.equal(scrapButtonShown(card({ visibility: "PRIVATE", scrapped: false }), ME), true);
  assert.equal(scrapButtonShown(card({ visibility: "PRIVATE", scrapped: true }), ME), true);
});

test("PUBLIC: 본인·타인 카드 모두 기존대로 보관 버튼이 노출된다", () => {
  assert.equal(scrapButtonShown(card({ visibility: "PUBLIC", authorPublicId: ME }), ME), true);
  assert.equal(scrapButtonShown(card({ visibility: "PUBLIC", authorPublicId: OTHER }), ME), true);
  // 게스트(viewer 없음)도 PUBLIC 에서는 버튼 자체는 그대로다(클릭은 requireAuth 가 가로챈다).
  assert.equal(scrapButtonShown(card({ visibility: "PUBLIC", authorPublicId: OTHER }), null), true);
});

test("타인 PRIVATE: 버튼이 노출되지 않는다 — 접근 제한을 우회하지 않는다", () => {
  assert.equal(
    scrapButtonShown(card({ visibility: "PRIVATE", authorPublicId: OTHER }), ME),
    false,
  );
  // 게스트도 마찬가지. (애초에 서버가 404 로 감춰 상세까지 오지 않는다.)
  assert.equal(
    scrapButtonShown(card({ visibility: "PRIVATE", authorPublicId: OTHER }), null),
    false,
  );
});

test("소유자 판정이 불확실한 PRIVATE 는 닫히는 쪽으로 간다", () => {
  // author 가 없는 응답(목록·PATCH 경로)·UUID 가 아닌 값·viewer 없음 → 전부 비노출.
  assert.equal(scrapButtonShown(card({ visibility: "PRIVATE", authorPublicId: null }), ME), false);
  assert.equal(scrapButtonShown(card({ visibility: "PRIVATE", authorPublicId: "me" }), "me"), false);
  assert.equal(scrapButtonShown(card({ visibility: "PRIVATE" }), null), false);
});

test("scrapped 가 검증되지 않으면 어떤 카드에서도 버튼을 두지 않는다", () => {
  for (const value of [null, undefined, "true", 1, {}]) {
    assert.equal(
      scrapButtonShown(card({ visibility: "PRIVATE", scrapped: value }), ME),
      false,
      `own PRIVATE / ${JSON.stringify(value)}`,
    );
    assert.equal(
      scrapButtonShown(card({ visibility: "PUBLIC", scrapped: value }), ME),
      false,
      `PUBLIC / ${JSON.stringify(value)}`,
    );
  }
});

/* ── 2. 토글 진입점 — 실패·연타 처리 ─────────────────────────────── */

/**
 * useCardScrap 을 렌더러 없이 실행한다. 훅이 쓰는 React API 는 필요한 만큼만 흉내 낸다
 * (useState = 값 보관, useRef = 가변 상자, useCallback = 그대로 반환, useEffect = 즉시 실행).
 * 모듈에서 꺼낸 함수를 `invoke` 로 부르는 이유는 morning-report-visibility 테스트와 같다 —
 * stub React 를 주입한 순수 함수 실행이라 rules-of-hooks 대상이 아님을 이름으로 밝힌다.
 */
function runScrapHook({ initialScrapped, publicId = "33333333-3333-4333-8333-333333333333", respond }) {
  const calls = [];
  const states = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (states.length <= index) states.push(initial);
      return [states[index], (next) => { states[index] = next; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (states.length <= index) states.push({ current: initial });
      return states[index];
    },
    useCallback: (fn) => fn,
    useEffect: (fn) => { fn(); },
  };

  const hookModule = loadTsModule("../hooks/use-card-scrap.ts", (id) => {
    if (id === "react") return react;
    if (id === "@/lib/repositories/scraps") {
      return {
        scrapCard: (id) => {
          calls.push({ method: "POST", id });
          return respond("POST");
        },
        unscrapCard: (id) => {
          calls.push({ method: "DELETE", id });
          return respond("DELETE");
        },
      };
    }
    return requireApp(id);
  });
  const invoke = hookModule.useCardScrap;

  function render() {
    cursor = 0;
    return invoke({ publicId, initialScrapped });
  }

  return { ...render(), calls, rerun: render };
}

const ok = (scrapped) => () => Promise.resolve({ scrapped });
const fail = () => () => Promise.reject(new Error("500"));

test("본인 PRIVATE 담기: 서버 확정값을 그대로 반영한다", async () => {
  const hook = runScrapHook({ initialScrapped: false, respond: ok(true) });
  hook.toggle();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(hook.calls.map((c) => c.method), ["POST"]);
  assert.equal(hook.rerun().scrapped, true);
});

test("본인 PRIVATE 해제: 현재 상태의 반대 방향으로 부른다", async () => {
  const hook = runScrapHook({ initialScrapped: true, respond: ok(false) });
  hook.toggle();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(hook.calls.map((c) => c.method), ["DELETE"]);
  assert.equal(hook.rerun().scrapped, false);
});

test("요청이 실패하면 잘못된 성공 상태가 남지 않는다", async () => {
  const hook = runScrapHook({ initialScrapped: false, respond: fail() });
  hook.toggle();
  await new Promise((r) => setImmediate(r));
  const after = hook.rerun();
  assert.equal(after.scrapped, false); // 낙관적 변경이 없으므로 그대로다
  assert.equal(after.failed, true);
  assert.equal(after.busy, false);
});

test("요청 중 연타는 차단된다 — 요청은 항상 1건", async () => {
  const hook = runScrapHook({ initialScrapped: false, respond: ok(true) });
  hook.toggle();
  hook.toggle(); // 같은 tick 재진입 (busy state 는 아직 false 로 보인다)
  hook.toggle();
  assert.equal(hook.calls.length, 1);
  await new Promise((r) => setImmediate(r));
  assert.equal(hook.calls.length, 1);
});

test("publicId 가 UUID 가 아니면 요청을 만들지 않는다", () => {
  const hook = runScrapHook({ initialScrapped: false, publicId: "not-a-uuid", respond: ok(true) });
  hook.toggle();
  assert.deepEqual(hook.calls, []);
});

/* ── 3. 화면 조건 — 소스 수준 회귀 ──────────────────────────────── */

const detailScreen = readFileSync(
  new URL("../components/report/card-detail-screen.tsx", import.meta.url),
  "utf8",
);

test("상세 화면이 `PUBLIC 이거나 소유자` + scrapped 검증으로 보관 버튼을 낸다", () => {
  assert.match(detailScreen, /\{\(isPublic \|\| owner\) && scrapped !== null && \(/);
});

test("소유자 판정은 기존 단일 소스(isCardOwner)를 그대로 쓴다", () => {
  assert.match(detailScreen, /const owner = isCardOwner\(shown, viewerPublicId\);/);
  assert.match(detailScreen, /viewerPublicId=\{user\?\.publicId \?\? null\}/);
});

test("보관 노출 조건이 PUBLIC 전용으로 되돌아가지 않는다", () => {
  // 회귀 방지: `isPublic && scrapped` 형태가 다시 들어오면 내 PRIVATE 가 또 막힌다.
  assert.doesNotMatch(detailScreen, /\{isPublic && scrapped !== null && \(/);
});

test("좋아요·댓글의 PUBLIC 전용 조건은 건드리지 않는다(범위 밖 회귀 방지)", () => {
  assert.match(detailScreen, /\{isPublic && social !== null && \(/);
  assert.match(detailScreen, /\{isPublic && <CardComments/);
});

/* ── 4. /scraps 목록 — 프론트가 PRIVATE 를 거르지 않는다 ────────── */

const scrapScreen = readFileSync(
  new URL("../components/scrap/scrap-screen.tsx", import.meta.url),
  "utf8",
);
const scrapsRepo = readFileSync(
  new URL("../lib/repositories/scraps.ts", import.meta.url),
  "utf8",
);

/**
 * 주석을 걷어낸 **코드만** 본다 — 계약을 설명하는 주석에는 PUBLIC·PRIVATE 가 당연히 나오므로
 * 원문을 그대로 훑으면 주석 문구가 바뀔 때마다 흔들린다(실제로 이 커밋에서 걸렸다).
 */
function codeOnly(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

test("보관함 목록에 공개 범위 기반 필터가 없다", () => {
  // 로컬 해제분(removedIds) 외의 filter 가 들어오면 내 PRIVATE 카드가 목록에서 사라진다.
  const code = codeOnly(scrapScreen);
  const filters = code.match(/\.filter\(/g) ?? [];
  assert.equal(filters.length, 1);
  assert.match(code, /\.filter\(\(c\) => !removedIds\.has\(c\.publicId\)\)/);
  assert.doesNotMatch(code, /visibility|PUBLIC|PRIVATE/);
});

test("보관함 repository 가 응답을 공개 범위로 거르지 않는다", () => {
  const code = codeOnly(scrapsRepo);
  assert.doesNotMatch(code, /visibility|PUBLIC|PRIVATE/);
  assert.doesNotMatch(code, /\.filter\(/);
  // 배열 검증만 하고 응답을 그대로 돌려준다.
  assert.match(code, /return data;/);
});
