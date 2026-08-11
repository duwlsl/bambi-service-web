import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

const sourceUrl = new URL("../lib/home-logo-click.ts", import.meta.url);
const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourceUrl.pathname,
});
const commonJsModule = { exports: {} };
vm.runInNewContext(
  compiled.outputText,
  { module: commonJsModule, exports: commonJsModule.exports },
  { filename: sourceUrl.pathname },
);

const { shouldResetHomeOnLogoClick } = commonJsModule.exports;

test("다른 경로에서는 항상 기본 Link 이동을 허용한다(false)", () => {
  assert.equal(shouldResetHomeOnLogoClick("/report/abc", true), false);
  assert.equal(shouldResetHomeOnLogoClick("/report/abc", false), false);
  assert.equal(shouldResetHomeOnLogoClick("/scraps", true), false);
});

test("`/`에서는 초기화 콜백이 있을 때만 네비게이션을 막고 초기화한다", () => {
  assert.equal(shouldResetHomeOnLogoClick("/", true), true);
  // 콜백이 없는 호출부(로딩·에러 스켈레톤 등)는 기존처럼 Link 이동이 그대로 일어난다.
  assert.equal(shouldResetHomeOnLogoClick("/", false), false);
});
