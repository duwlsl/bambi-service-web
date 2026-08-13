import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * 온보딩 마지막 단계 — 클리퍼 설치 안내(3/3)의 불변식.
 *
 * 클리퍼는 별도 Chrome 확장 프로그램이라 **웹이 할 수 있는 일은 안내뿐**이다. 설치 여부는
 * 페이지가 알 수 없고(확장 저장소 접근 불가), 알아낼 이유도 없다. 그래서 이 화면은
 * "스토어를 새 탭으로 열어준다 · 아니면 그냥 넘어간다" 두 갈래만 유지해야 한다 —
 * 설치 감지·강제 설치·권한 확인이 끼어들면 온보딩이 끝나지 않는 화면이 된다.
 *
 * 또 하나: 모바일 Chrome 은 확장을 설치할 수 없다. 안내 없이 주 CTA 만 두면 모바일 사용자는
 * 스토어에서 막힌 뒤 돌아올 길을 잃는다.
 */
const screen = readFileSync(
  new URL("../components/onboarding/onboarding-screen.tsx", import.meta.url),
  "utf8",
);
const constants = readFileSync(new URL("../constants/clipper.ts", import.meta.url), "utf8");

/** "이 표기가 없어야 한다" 류 검사는 주석을 뺀 코드만 본다(결정 근거를 파일에 남길 수 있어야 한다). */
function code(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("웹 스토어 주소는 constants 한 곳에만 있고 화면은 상수를 쓴다", () => {
  assert.match(
    constants,
    /export const CLIPPER_CHROME_WEBSTORE_URL =\s*\n?\s*"https:\/\/chromewebstore\.google\.com\/detail\/[^"]*igppogonpcbfplikeemaldkoakhginjk"/,
    "확장 ID 가 바뀌면 고칠 곳이 하나여야 한다",
  );
  assert.match(code(screen), /CLIPPER_CHROME_WEBSTORE_URL/);
  assert.doesNotMatch(
    code(screen),
    /chromewebstore\.google\.com/,
    "화면에 주소를 직접 적으면 상수와 갈라진다",
  );
});

test("저장 성공 뒤 완료 화면에서 클리퍼 안내로 이어진다", () => {
  const body = code(screen);
  assert.match(body, /type OnboardingStep = "pick" \| "done" \| "clipper"/);
  assert.match(body, /setStep\("done"\)/, "저장 성공 지점은 그대로 완료 화면이다");
  assert.match(
    body,
    /onClick=\{\(\) => setStep\("clipper"\)\}/,
    "완료 화면의 주 CTA 가 설치 안내 단계를 연다",
  );
});

test("설치 CTA 는 스토어를 새 탭으로 연다 — 이 탭의 온보딩은 남는다", () => {
  const cta = code(screen).match(/<a\s+href=\{CLIPPER_CHROME_WEBSTORE_URL\}[\s\S]*?<\/a>/);
  assert.ok(cta, "설치 CTA 앵커를 찾지 못했다");
  assert.match(cta[0], /target="_blank"/);
  assert.match(cta[0], /rel="noopener noreferrer"/, "새 탭에 opener 를 넘기지 않는다");
  assert.match(cta[0], /Chrome에 설치하기/);
});

test("설치하지 않고도 내 보고서로 나갈 수 있다", () => {
  assert.match(code(screen), /href="\/"[\s\S]{0,400}나중에 하기/, "보조 CTA 는 내 보고서로 간다");
});

test("스토어를 연 뒤 현재 탭에서 이어갈 CTA 가 나타난다", () => {
  const body = code(screen);
  assert.match(body, /onClick=\{\(\) => setStoreOpened\(true\)\}/);
  assert.match(
    body,
    /aria-live="polite"[\s\S]{0,200}storeOpened &&[\s\S]{0,400}내 보고서로 가기/,
    "새 탭이 열리면 이 탭에는 다음 경로가 보여야 한다",
  );
});

test("모바일에서는 설치할 수 없다는 것을 알려준다", () => {
  assert.match(
    code(screen),
    /sm:hidden[\s\S]{0,200}데스크톱 Chrome에서 설치할 수 있어요\./,
    "좁은 화면에서만 노출한다(데스크톱에는 불필요한 안내다)",
  );
});

test("설치 여부를 감지하거나 강제하지 않는다", () => {
  const body = code(screen);
  assert.doesNotMatch(body, /\bchrome\.\w/, "확장 API 접근 금지 — 웹 페이지가 알 수 있는 정보가 아니다");
  assert.doesNotMatch(body, /window\.open\(/, "앵커 target=_blank 로 충분하다");
  assert.doesNotMatch(body, /navigator\.permissions/, "권한을 캐묻지 않는다");
  assert.doesNotMatch(
    body,
    /repositories\/clipper|api\/clipper/,
    "설치 안내를 위해 새로 부를 API 는 없다",
  );
  // storeOpened 는 "스토어를 열었다" 는 사실만 담는다 — 설치 상태로 이름 붙이면 없는 정보를 있는 척하게 된다.
  assert.doesNotMatch(body, /installed|isInstalled/i, "설치 여부를 아는 척하는 상태를 두지 않는다");
});

test("헤더 총 단계 수는 한 곳에서만 정해진다", () => {
  const body = code(screen);
  assert.match(body, /const ONBOARDING_STEP_TOTAL = 3/);
  assert.match(body, /\{stepNo\}<\/b> \/ \{ONBOARDING_STEP_TOTAL\}/, "총 단계를 직접 적지 않는다");
  assert.match(body, /stepLabel="클리퍼 설치" stepNo=\{3\}/);
});
