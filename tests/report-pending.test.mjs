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
  IDLE_PENDING_POLL_MS,
  formatPendingCreatedAt,
  getPreparingReportTitle,
  isGenerationPendingDto,
  observePendingFailure,
  observePendingSuccess,
  REPORT_PENDING_PATH,
} = commonJsModule.exports;

function pending(id, status = "PENDING", reportType = "ON_DEMAND") {
  return {
    id,
    topic: "AI",
    contentType: "briefing",
    reportType,
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
  assert.equal(isGenerationPendingDto(pending("job-onboarding", "PENDING", "ONBOARDING")), true);
  assert.equal(isGenerationPendingDto(pending("job-wiki", "PENDING", "WIKI_INTEREST")), true);
  assert.equal(isGenerationPendingDto(pending("job-a", "COMPLETED")), false);
  assert.equal(isGenerationPendingDto(pending("job-a", "READY")), false);
  const missingUpdatedAt = { ...pending("job-a") };
  delete missingUpdatedAt.updatedAt;
  assert.equal(isGenerationPendingDto(missingUpdatedAt), false);
});

test("처리중 UI는 아침·온보딩·온디맨드·Wiki 유형별 문구를 사용한다", () => {
  assert.equal(
    getPreparingReportTitle("서버 placeholder", "MORNING_BRIEFING"),
    "오늘의 아침 브리핑을 생성하고 있어요",
  );
  assert.equal(
    getPreparingReportTitle("AI", "ONBOARDING"),
    "첫 리포트를 생성하고 있어요",
  );
  assert.equal(getPreparingReportTitle("AI", "ON_DEMAND"), "AI 보고서");
  assert.equal(
    getPreparingReportTitle("반도체", "WIKI_INTEREST"),
    "반도체 Wiki 관심사 보고서",
  );
});

test("활성 pending은 5초, 빈 목록은 30초 polling한다", () => {
  assert.equal(observePendingSuccess(null, [pending("job-a")]).nextIntervalMs, ACTIVE_PENDING_POLL_MS);
  assert.equal(observePendingSuccess(null, []).nextIntervalMs, IDLE_PENDING_POLL_MS);
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

test("활성 작업을 아직 발견하지 못한 API 실패도 30초 뒤 재시도한다", () => {
  const failed = observePendingFailure(null);
  assert.equal(failed.shouldRefreshFeed, false);
  assert.equal(failed.snapshot, null);
  assert.equal(failed.nextIntervalMs, IDLE_PENDING_POLL_MS);
});

/* ── 처리중 슬롯 생성 시각 표기 ────────────────────────────────────
   `GET /api/reports/pending` 의 createdAt(서버 OffsetDateTime → ISO 문자열)을
   `8월 11일 18:30 요청` 절대 표기로 바꾼다. 상대 시간(3분 전)은 렌더 시점에 의존해
   SSR·클라이언트 결과가 갈리고 polling 마다 값이 흔들리므로 쓰지 않는다.
   ────────────────────────────────────────────────────────────── */

test("서버 UTC 시각을 서비스 기준(KST) 절대 표기로 바꾼다", () => {
  // 2026-08-11T09:30:00Z = KST 18:30
  assert.equal(formatPendingCreatedAt("2026-08-11T09:30:00Z"), "8월 11일 18:30 요청");
});

test("오프셋이 붙은 표기도 같은 순간이면 같은 문자열이다", () => {
  // 세 값은 모두 같은 순간(KST 18:30)이다 — 표기 형식이 달라도 결과가 흔들리면 안 된다.
  const expected = "8월 11일 18:30 요청";
  assert.equal(formatPendingCreatedAt("2026-08-11T18:30:00+09:00"), expected);
  assert.equal(formatPendingCreatedAt("2026-08-11T09:30:00.123456Z"), expected);
  assert.equal(formatPendingCreatedAt("2026-08-11T05:30:00-04:00"), expected);
});

test("타임존을 고정해 실행 환경 기본 시간대와 무관하게 같은 값을 만든다", () => {
  // hydration 불일치 방지의 핵심 — 서버(UTC 컨테이너)와 브라우저(KST)가 같은 문자열을 내야 한다.
  const original = process.env.TZ;
  const seen = new Set();
  for (const tz of ["UTC", "America/New_York", "Asia/Seoul", "Europe/Berlin"]) {
    process.env.TZ = tz;
    seen.add(formatPendingCreatedAt("2026-08-11T09:30:00Z"));
  }
  if (original === undefined) delete process.env.TZ;
  else process.env.TZ = original;
  assert.deepEqual([...seen], ["8월 11일 18:30 요청"]);
});

test("자정 직전·직후도 KST 날짜로 끊는다", () => {
  // 2026-08-11T15:00:00Z = KST 2026-08-12 00:00 → 날짜가 하루 넘어가야 한다.
  assert.equal(formatPendingCreatedAt("2026-08-11T15:00:00Z"), "8월 12일 00:00 요청");
  assert.equal(formatPendingCreatedAt("2026-08-11T14:59:00Z"), "8월 11일 23:59 요청");
});

test("24시간 표기를 쓴다(ko-KR 기본값 '오후 06:30' 이 아니다)", () => {
  const label = formatPendingCreatedAt("2026-08-11T09:30:00Z");
  assert.equal(label.includes("오후"), false);
  assert.equal(label.includes("오전"), false);
  assert.match(label, /\d{2}:\d{2} 요청$/);
});

test("값이 없으면 빈 문자열 — 호출부가 줄 자체를 그리지 않는다", () => {
  for (const value of [undefined, null, "", "   "]) {
    assert.equal(formatPendingCreatedAt(value), "", JSON.stringify(value));
  }
});

test("파싱할 수 없는 값도 빈 문자열 — Invalid Date·현재 시각 대체 금지", () => {
  for (const value of ["not-a-date", "2026-13-45T99:99:99Z", "어제", 0, 1754900000000, {}, []]) {
    assert.equal(formatPendingCreatedAt(value), "", JSON.stringify(value));
  }
});

test("빈 문자열 결과에는 '요청' 접미사조차 남지 않는다", () => {
  // "  요청" 처럼 값 없이 접미사만 남으면 화면에 의미 없는 꼬리가 붙는다.
  assert.equal(formatPendingCreatedAt(null).includes("요청"), false);
  assert.equal(formatPendingCreatedAt("not-a-date").includes("요청"), false);
});

test("Pending DTO 의 createdAt 을 그대로 넣으면 표기가 만들어진다", () => {
  // 훅(toPreparingReport)이 옮기는 값이 실제로 이 함수와 맞물리는지 확인한다.
  const dto = pending("job-a");
  assert.equal(isGenerationPendingDto(dto), true);
  assert.equal(formatPendingCreatedAt(dto.createdAt), "8월 10일 09:00 요청");
});
