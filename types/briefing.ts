/**
 * 아침 브리핑 주제 선택 타입 — GET/PUT /api/users/me/briefing-topics.
 *
 * 계약 실측: bambi-service-api `briefing/`(PR #65, main 머지 `c230f7c`) 소스 확인, 2026-08-09.
 *
 * **UUID 가 아니라 이름 문자열로 저장한다.** 관심 Profile 은 재계산할 때마다 기존 active 를
 * retired 로 내리고 새 Profile 을 만들어서 `interest_id` 가 매번 새로 발급된다 — id 로 저장하면
 * 사용자가 미리 골라둔 값이 다음 재계산에 retired 를 가리켜 조용히 죽는다. agent 계약도
 * `topics[]` = 이름 배열이라 이름이 그대로 전송값이다(변환 없음).
 */

/**
 * 조회·저장 공용 data. **미선택은 404 가 아니라 빈 배열**이다.
 *
 * - 순서가 의미를 갖는다: 서버가 `position` 으로 보존하며, agent 계약상 `topics` 순서가
 *   리포트 안 섹션 순서다 → 프론트도 순서를 흔들지 않는다.
 * - 저장 응답은 **정규화된 결과**다(공백 정리·빈 항목 제외·중복 합침). 프론트가 보낸 것과
 *   다를 수 있으므로 저장 후에는 이 응답으로 상태를 갱신한다.
 */
export type BriefingTopicsData = {
  topics: string[];
};
