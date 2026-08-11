import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

// report-pending.test.mjs 와 같은 패턴(트랜스파일 + vm 격리)을 쓰되, 이 모듈은 값 import가 있어
// require shim을 더한다 — "@/..." 별칭만 여기서 해석하고, 나머지(clsx 등 실제 npm 패키지)는
// Node의 실제 require로 넘긴다. resolveNotificationTarget이 쓰는 두 레포지토리는 이 테스트가
// 호출하지 않는 경로라 빈 스텁으로 충분하다.
const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map();

function loadTsModule(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const key = sourceUrl.pathname;
  if (moduleCache.has(key)) return moduleCache.get(key);

  const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: key,
  });
  const commonJsModule = { exports: {} };

  function sandboxRequire(specifier) {
    if (specifier === "@/lib/utils") return loadTsModule("../lib/utils.ts");
    if (specifier === "@/lib/repositories/feed") return { fetchMemberFeed: async () => [] };
    if (specifier === "@/lib/repositories/report") return { normalizeReportId: (value) => value };
    return nodeRequire(specifier);
  }

  vm.runInNewContext(
    compiled.outputText,
    { module: commonJsModule, exports: commonJsModule.exports, require: sandboxRequire },
    { filename: key },
  );
  moduleCache.set(key, commonJsModule.exports);
  return commonJsModule.exports;
}

const { parseFollowTargetPath } = loadTsModule("../lib/notifications/resolve-notification-target.ts");

const UUID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

test("FOLLOW targetPath는 /users/{UUID} 형식일 때만 그대로 통과한다", () => {
  assert.equal(parseFollowTargetPath(`/users/${UUID}`), `/users/${UUID}`);
});

test("UUID가 아니거나 빈 세그먼트인 targetPath는 거부한다", () => {
  assert.equal(parseFollowTargetPath("/users/not-a-uuid"), null);
  assert.equal(parseFollowTargetPath("/users/"), null);
  assert.equal(parseFollowTargetPath("/users"), null);
});

test("추가 세그먼트·query·hash가 붙은 targetPath는 거부한다", () => {
  assert.equal(parseFollowTargetPath(`/users/${UUID}/extra`), null);
  assert.equal(parseFollowTargetPath(`/users/${UUID}?x=1`), null);
  assert.equal(parseFollowTargetPath(`/users/${UUID}#frag`), null);
});

test("외부 URL·protocol-relative·javascript: 등 다른 prefix는 거부한다(오픈 리다이렉트 방지)", () => {
  assert.equal(parseFollowTargetPath("https://evil.example/users/x"), null);
  assert.equal(parseFollowTargetPath("//evil.example/users/x"), null);
  assert.equal(parseFollowTargetPath("javascript:alert(1)"), null);
  assert.equal(parseFollowTargetPath(`/report/${UUID}`), null);
});
