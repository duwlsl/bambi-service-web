/**
 * 관심사 · LLM Wiki 화면 문구 매핑 (단일 소스).
 *
 * 근거 코드는 agent 가 evidence.reasons 에 담아 보내고 service 가 그대로 중계한다.
 * 화면에는 원시 코드값을 노출하지 않으며, 아래 노출 허용 목록(allowlist)에 있는 코드만 문구로 바꾼다.
 *
 * documentKind 는 내부 필드라 화면 모델로 옮기지 않으므로 라벨 매핑도 두지 않는다.
 */

/**
 * 사용자에게 보여줄 근거 코드 → 한글 문구 (노출 허용 목록).
 *
 * 코드값은 bambi-agent-api 실측 기준이다 (2026-07-29 확인):
 *   - `wiki_node`         — domain/interests/features/extraction.py 가 Wiki 노드 기반 후보에 붙인다.
 *   - `behavior:<signal>` — domain/interests/features/scoring.py 가 행동 신호마다 붙인다.
 *     signal 은 like · unlike · hide · report 4종(_SIGNAL_WEIGHTS).
 *
 * ⚠ 이 목록에는 **긍정 신호만** 담는다. `behavior:unlike` · `behavior:hide` · `behavior:report` 는
 *   agent 점수 계산용 부정 신호이므로 "AI가 이해한 관심사"의 근거로 보여주지 않는다.
 *   목록에 없는 코드(부정 신호 + 아직 모르는 신규 코드)는 대체 문구로 바꾸지 않고 그대로 제외한다
 *   — 새 신호가 추가돼도 검토 전까지 화면에 새지 않는다.
 */
export const EVIDENCE_REASON_MESSAGES: Record<string, string> = {
  wiki_node: "저장한 자료에서 반복해 나타난 주제예요",
  "behavior:like": "관련 카드에 좋아요를 눌렀어요",
};

/**
 * 근거 코드 목록 → 화면에 보여줄 문구 목록.
 * 노출 허용 목록에 없는 코드는 조용히 제외한다. 전부 제외되면 빈 배열이 되고,
 * 호출부(관심사 카드)는 근거 줄 자체를 렌더하지 않는다.
 */
export function toEvidenceReasonMessages(codes: string[]): string[] {
  const messages: string[] = [];
  for (const code of codes) {
    const message = EVIDENCE_REASON_MESSAGES[code];
    if (message !== undefined) messages.push(message);
  }
  return messages;
}
