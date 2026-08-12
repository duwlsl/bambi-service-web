import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

// 설정 파일은 레포 루트에 있고 vitest 도 레포 루트에서 실행된다(package.json script 경유).
const rootDir = resolve(process.cwd());

/**
 * Vitest 설정 — 신규 컴포넌트·API 상태 테스트 전용.
 *
 * 기존 `tests/*.test.mjs`(node --test, 12파일)는 **여기 대상이 아니다.** 두 러너가 같은 파일을
 * 두 번 돌면 실패 원인이 어느 쪽 것인지 흐려지므로, include 를 `tests/unit/` 로 좁혀 병존시킨다.
 * 기존 파일의 이관은 이 PR 범위 밖이다(그대로 `npm run test:legacy` 가 돌린다).
 *
 * 확장자가 `.mts` 인 이유: 이 파일이 CJS 로 로드되면 Vite 가 "ESM syntax in a file loaded as
 * CommonJS" 경고를 낸다. 레포 전체를 `"type": "module"` 로 바꾸는 건 이 PR 범위 밖이라
 * 설정 파일만 명시적 ESM 으로 둔다.
 *
 * jsdom·alias·env 세 가지만 앱과 맞춘다:
 * - alias `@` → 레포 루트. tsconfig 의 paths 와 같은 규칙이라 테스트에서만 다른 경로를 쓰지 않는다.
 * - NEXT_PUBLIC_API_URL 은 **테스트 전용 더미 origin**이다. 공통 client(getApiBaseUrl)가 값 없으면
 *   throw 하므로 반드시 필요하고, 이 값으로 나가는 요청은 MSW 가 전부 가로챈다.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    /**
     * 기본 pool(`forks`)은 이 개발 환경(Windows)에서 워커가 60초 안에 응답하지 못해
     * "Failed to start forks worker" 로 실패한다(실측). 테스트 내용과 무관한 실행기 문제라
     * 스레드 풀로 고정한다 — 실패를 skip 으로 덮지 않고 원인 계층에서 해결한 것이다.
     */
    pool: "threads",
    // 테스트 간 mock·DOM 잔상 제거(cleanup 은 setup 파일의 afterEach 가 담당).
    clearMocks: true,
    restoreMocks: true,
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost",
    },
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
