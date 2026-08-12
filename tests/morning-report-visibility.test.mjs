import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

/**
 * 아침 보고서 공개 전환 차단 회귀 테스트.
 *
 * tests/report-delta.test.mjs 와 같은 "TS 를 직접 트랜스파일해 vm 에서 실행" 패턴이다.
 * 검증 대상은 두 층이다:
 *   1. 판정 단일 소스 — lib/report-type.ts 의 isMorningBriefing
 *   2. mutation 진입점 — hooks/use-card-visibility.ts 의 change()
 *      (UI 조건과 별개로 여기서도 막혀야 한다. React 훅이라 useState/useRef/useCallback 을
 *       최소 stub 으로 대체해 순수 로직만 돌린다 — 렌더러를 띄우지 않고 "요청이 나갔는가"를 본다.)
 *
 * 서버 가드가 없다는 사실은 이 테스트의 전제다(CardService.changeVisibility 는 소유권만 검사).
 * 따라서 여기서 검증하는 것은 **프론트가 요청을 보내지 않는다**는 것뿐이다.
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

const { isMorningBriefing, toReportType } = loadTsModule("../lib/report-type.ts");

/* ── 1. 판정 단일 소스 ──────────────────────────────────────────── */

test("MORNING_BRIEFING 만 아침 브리핑이다", () => {
  assert.equal(isMorningBriefing("MORNING_BRIEFING"), true);
});

test("다른 생성 종류는 아침 브리핑이 아니다(기존 공개 전환 유지)", () => {
  for (const type of ["ON_DEMAND", "ONBOARDING", "WIKI_INTEREST"]) {
    assert.equal(isMorningBriefing(type), false, type);
  }
});

test("값이 없거나 계약 밖이면 아침 브리핑이 아니다 — 기존 카드를 통째로 막지 않는다", () => {
  // reportType 이 없던 배포본에서 발행된 카드가 운영에 실제로 있다(2026-08-11 실측: null 1건).
  for (const value of [null, undefined, "", "morning_briefing", "UNKNOWN", 0, {}, []]) {
    assert.equal(isMorningBriefing(value), false, JSON.stringify(value));
  }
});

test("판정은 제목 문자열이 아니라 reportType 으로만 한다", () => {
  // 운영 아침 브리핑 제목은 '오늘의 관심사 브리핑' 이지만 제목은 근거가 아니다.
  assert.equal(isMorningBriefing("오늘의 관심사 브리핑"), false);
  assert.equal(toReportType("오늘의 관심사 브리핑"), null);
});

/* ── 2. mutation 진입점 방어 ────────────────────────────────────── */

/**
 * useCardVisibility 를 렌더러 없이 실행한다. 훅이 쓰는 React API 는 이 훅에 필요한 만큼만
 * 흉내 낸다(useState = 값 보관, useRef = 가변 상자, useCallback = 그대로 반환).
 * 반환된 change() 를 직접 불러 **changeCardVisibility 가 호출됐는지**를 본다.
 *
 * 모듈에서 꺼낸 함수를 `invoke` 라는 이름에 담아 부른다 — 여기서는 React 훅이 아니라
 * stub React 를 주입한 **순수 함수**로 실행하는 것이라서, 훅 호출 규칙(rules-of-hooks)의
 * 대상이 아님을 호출 이름으로 분명히 한다(규칙을 비활성화하지 않는다).
 */
function runHook({ reportType }) {
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
  };

  const hookModule = loadTsModule("../hooks/use-card-visibility.ts", (id) => {
    if (id === "react") return react;
    if (id === "@/lib/repositories/card") {
      return {
        changeCardVisibility: (publicId, visibility) => {
          calls.push({ publicId, visibility });
          return Promise.resolve({ visibility });
        },
      };
    }
    if (id === "@/lib/report-type") return { isMorningBriefing };
    throw new Error(`unexpected require: ${id}`);
  });
  const invoke = hookModule.useCardVisibility;

  function render() {
    cursor = 0;
    return invoke({ publicId: "card-1", reportType, onChanged: () => {} });
  }

  return { ...render(), calls, rerun: render };
}

test("아침 보고서: 공개 전환 요청이 아예 나가지 않는다", () => {
  const hook = runHook({ reportType: "MORNING_BRIEFING" });
  hook.change("PUBLIC");
  assert.deepEqual(hook.calls, []); // 네트워크 요청 0건
  assert.equal(hook.rerun().blocked, true); // 안내 문구 근거가 세워진다
});

test("아침 보고서: 비공개로 되돌리는 것은 막지 않는다(이미 공개된 비정상 데이터 회수)", () => {
  const hook = runHook({ reportType: "MORNING_BRIEFING" });
  hook.change("PRIVATE");
  assert.deepEqual(hook.calls, [{ publicId: "card-1", visibility: "PRIVATE" }]);
});

test("일반 비공개 보고서: 기존대로 공개 전환 요청이 나간다", () => {
  for (const type of ["ON_DEMAND", "ONBOARDING", "WIKI_INTEREST"]) {
    const hook = runHook({ reportType: type });
    hook.change("PUBLIC");
    assert.deepEqual(hook.calls, [{ publicId: "card-1", visibility: "PUBLIC" }], type);
  }
});

test("일반 공개 보고서: 비공개 전환 동작이 그대로 유지된다", () => {
  const hook = runHook({ reportType: "ON_DEMAND" });
  hook.change("PRIVATE");
  assert.deepEqual(hook.calls, [{ publicId: "card-1", visibility: "PRIVATE" }]);
});

test("불완전한 데이터(reportType 누락·계약 밖 값): 기존 공개 전환을 막지 않는다", () => {
  for (const value of [undefined, null, "", "UNKNOWN", 42]) {
    const hook = runHook({ reportType: value });
    hook.change("PUBLIC");
    assert.equal(hook.calls.length, 1, JSON.stringify(value));
  }
});

/* ── 3. 화면 조건 — 소스 수준 회귀 ──────────────────────────────── */

const shareModal = readFileSync(
  new URL("../components/report/card-share-modal.tsx", import.meta.url),
  "utf8",
);
const detailScreen = readFileSync(
  new URL("../components/report/card-detail-screen.tsx", import.meta.url),
  "utf8",
);

test("공유 모달이 판정 단일 소스를 쓰고 공개 CTA 를 조건부로 둔다", () => {
  assert.match(shareModal, /import \{ isMorningBriefing \} from "@\/lib\/report-type"/);
  assert.match(shareModal, /const canPublish = !isMorningBriefing\(reportType\)/);
  // 공개하기 버튼이 canPublish 분기 안에 있어야 한다(비활성이 아니라 미노출).
  assert.match(shareModal, /\) : canPublish \? \(/);
});

test("상세 화면이 서버 원본 reportType 을 모달로 넘긴다", () => {
  assert.match(detailScreen, /reportType=\{shown\.reportType\}/);
});

test("훅이 mutation 진입점에서 판정 단일 소스를 쓴다", () => {
  const hookSource = readFileSync(
    new URL("../hooks/use-card-visibility.ts", import.meta.url),
    "utf8",
  );
  assert.match(hookSource, /import \{ isMorningBriefing \} from "@\/lib\/report-type"/);
  assert.match(hookSource, /if \(next === "PUBLIC" && publishBlocked\)/);
});

/* ── 4. PRIVATE 아침 브리핑 — 공유 진입점 제거 ─────────────────── */

test("PRIVATE 아침 브리핑은 상세에서 공유 버튼을 두지 않는다", () => {
  // 유형 판별은 명시적으로 — 제목·URL·공개 여부로 추정하지 않는다.
  assert.match(detailScreen, /import \{ isMorningBriefing \} from "@\/lib\/report-type"/);
  assert.match(
    detailScreen,
    /const morningBriefingPrivate = isMorningBriefing\(shown\.reportType\) && !isPublic;/,
  );
  // 공유 버튼이 그 조건 뒤에 있어야 한다.
  assert.match(detailScreen, /\{owner && !morningBriefingPrivate \? \(/);
});

test("PUBLIC 아침 브리핑(구 데이터)의 공유 진입점은 남긴다", () => {
  /*
    조건에 `!isPublic` 이 들어가 있어야 PUBLIC 아침 브리핑에서는 버튼이 유지된다.
    그 모달이 `비공개로 전환` 의 유일한 경로라, 여기까지 감추면 이미 나간 노출을 사용자가
    스스로 거둘 수 없다(#92 가 PUBLIC→PRIVATE 를 막지 않는 것과 같은 이유).
  */
  assert.match(detailScreen, /isMorningBriefing\(shown\.reportType\) && !isPublic/);
});

test("공유 버튼을 감췄다고 공개 차단 로직을 걷어내지 않는다", () => {
  // 진입점 정리는 UX 일 뿐 차단 수단이 아니다 — 훅·모달의 이중 방어가 그대로 남아야 한다.
  const hookSource = readFileSync(
    new URL("../hooks/use-card-visibility.ts", import.meta.url),
    "utf8",
  );
  assert.match(hookSource, /setBlocked\(true\)/);
  assert.match(shareModal, /const canPublish = !isMorningBriefing\(reportType\)/);
  assert.match(detailScreen, /reportType=\{shown\.reportType\}/);
});
