import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

const sourceUrl = new URL("../lib/report-pending.ts", import.meta.url);
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

const {
  ACTIVE_PENDING_POLL_MS,
  isGenerationPendingDto,
  observePendingFailure,
  observePendingSuccess,
  REPORT_PENDING_PATH,
} = commonJsModule.exports;

function pending(id, status = "PENDING") {
  return {
    id,
    topic: "AI",
    contentType: "briefing",
    reportType: "ON_DEMAND",
    status,
    createdAt: "2026-08-10T09:00:00+09:00",
    updatedAt: "2026-08-10T09:00:00+09:00",
    errorCode: null,
  };
}

test("실제 pending 경로와 DTO의 활성 상태만 허용한다", () => {
  assert.equal(REPORT_PENDING_PATH, "/api/reports/pending");
  for (const status of ["PENDING", "RUNNING", "PUBLISHING"]) {
    assert.equal(isGenerationPendingDto(pending("job-a", status)), true);
  }
  assert.equal(isGenerationPendingDto({ ...pending("job-a"), contentType: null }), true);
  assert.equal(isGenerationPendingDto(pending("job-a", "COMPLETED")), false);
  assert.equal(isGenerationPendingDto(pending("job-a", "READY")), false);
  const missingUpdatedAt = { ...pending("job-a") };
  delete missingUpdatedAt.updatedAt;
  assert.equal(isGenerationPendingDto(missingUpdatedAt), false);
});

test("활성 pending이 있을 때만 5초 polling한다", () => {
  assert.equal(observePendingSuccess(null, [pending("job-a")]).nextIntervalMs, ACTIVE_PENDING_POLL_MS);
  assert.equal(observePendingSuccess(null, []).nextIntervalMs, null);
});

test("최초 빈 목록은 피드 갱신으로 오인하지 않는다", () => {
  const observation = observePendingSuccess(null, []);
  assert.equal(observation.shouldRefreshFeed, false);
});

test("동일 ID의 PENDING → RUNNING → PUBLISHING 전이는 완료가 아니다", () => {
  const first = observePendingSuccess(null, [pending("job-a", "PENDING")]);
  const running = observePendingSuccess(first.snapshot, [pending("job-a", "RUNNING")]);
  const publishing = observePendingSuccess(running.snapshot, [pending("job-a", "PUBLISHING")]);
  assert.equal(running.shouldRefreshFeed, false);
  assert.equal(publishing.shouldRefreshFeed, false);
});

test("기존 pending ID가 사라질 때 한 번만 피드 갱신 신호를 낸다", () => {
  const first = observePendingSuccess(null, [pending("job-a")]);
  const removed = observePendingSuccess(first.snapshot, []);
  const stillEmpty = observePendingSuccess(removed.snapshot, []);
  assert.equal(removed.shouldRefreshFeed, true);
  assert.equal(stillEmpty.shouldRefreshFeed, false);
});

test("API 실패는 작업 완료가 아니며 이전 활성 스냅샷을 유지한다", () => {
  const first = observePendingSuccess(null, [pending("job-a")]);
  const failed = observePendingFailure(first.snapshot);
  assert.equal(failed.shouldRefreshFeed, false);
  assert.equal(failed.snapshot, first.snapshot);
  assert.equal(failed.nextIntervalMs, ACTIVE_PENDING_POLL_MS);
});
