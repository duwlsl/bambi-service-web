import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 설정 — 핵심 사용자 흐름 E2E 최소 실행 기반.
 *
 * - **Chromium 하나만** 쓴다(크로스 브라우저는 이 PR 범위 밖).
 * - API 는 전부 `page.route` 로 stub 한다. 운영·로컬 백엔드에 의존하지 않는다.
 * - production build/start 로 띄운다. dev 서버는 첫 진입에서 온디맨드 컴파일이 끼어들어
 *   대기 시간이 실행마다 달라지는데, 그 흔들림을 테스트에서 `waitForTimeout` 으로 덮게 된다.
 *   빌드된 서버는 그 변수가 없어 대기를 전부 웹 우선(expect) 조건으로 쓸 수 있다.
 * - 서버가 이미 떠 있으면 재사용한다(로컬 반복 실행 시 매번 빌드하지 않게).
 */
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    // 실패했을 때만 근거를 남긴다 — 성공 실행에 산출물을 쌓지 않는다.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // 빌드 시 인라인되는 값. 이 origin 으로 나가는 요청은 테스트가 전부 가로챈다.
    env: { NEXT_PUBLIC_API_URL: "http://localhost" },
  },
});
