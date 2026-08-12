import { setupServer } from "msw/node";

/**
 * MSW Node server — Vitest 전용 단일 인스턴스.
 *
 * 기본 핸들러를 **하나도 등록하지 않는다.** 전체 API 를 미리 흉내 내면 계약이 바뀌어도
 * 테스트가 계속 통과해 버린다. 각 테스트가 그 테스트에 필요한 응답만 `server.use()` 로 얹고,
 * 등록하지 않은 요청은 setup 의 `onUnhandledRequest: "error"` 로 즉시 실패한다
 * (= 운영·로컬 백엔드로 새어 나가는 요청이 조용히 성공하는 일이 없다).
 */
export const server = setupServer();
