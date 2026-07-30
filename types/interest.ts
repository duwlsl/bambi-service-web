/**
 * 관심사 API 타입 — bambi-service-api `interest/` 실측 코드 기준 (확인일 2026-07-30).
 *
 * - `InterestResponse.java` 1:1: { id, name, source, createdAt }
 * - source 는 DB CHECK 제약과 동일한 2종뿐(`InterestSource.java`):
 *   USER = 사용자가 직접 설정 · INFERRED = agent 추론(P1, `/api/interests` 로는 생성되지 않음).
 * - name 은 자유 문자열 1~100자(`InterestRequest` @NotBlank @Size(max=100), V1 스키마 length=100).
 *   서버에 category 저장 필드는 없다 → category 는 화면 표시용 그룹일 뿐이다(constants/interests.ts).
 */
export type InterestSource = "USER" | "INFERRED";

export type InterestDto = {
  id: number;
  name: string;
  source: InterestSource;
  createdAt: string;
};
