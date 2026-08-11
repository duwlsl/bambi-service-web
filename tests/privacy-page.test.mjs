import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const privacyPage = readFileSync(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");
const signupPage = readFileSync(new URL("../app/signup/email/page.tsx", import.meta.url), "utf8");
const authShell = readFileSync(
  new URL("../components/auth/auth-shell.tsx", import.meta.url),
  "utf8",
);

test("the privacy route discloses the clipper's collected browsing data", () => {
  assert.match(privacyPage, /웹페이지의 URL, 제목, 본문 텍스트/);
  assert.match(privacyPage, /YouTube 자막/);
  assert.match(privacyPage, /아이콘을 누르지 않은 탭이나 과거 방문 기록을 백그라운드에서 수집하지 않습니다/);
});

test("the privacy route includes Chrome Web Store Limited Use commitments", () => {
  assert.match(privacyPage, /Chrome 웹 스토어 사용자 데이터 정책/);
  assert.match(privacyPage, /Limited/);
  assert.match(privacyPage, /맞춤형 광고/);
  assert.match(privacyPage, /데이터\s+판매/);
});

test("signup and authentication screens link to the public privacy route", () => {
  assert.match(signupPage, /href="\/privacy"/);
  assert.match(authShell, /href="\/privacy"/);
});
