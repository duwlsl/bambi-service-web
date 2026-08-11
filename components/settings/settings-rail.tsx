"use client";

import {
  reportNotificationLabel,
  reportVisibilityLabel,
} from "@/components/settings/report-settings-options";
import { themeModeLabel } from "@/components/settings/theme-modes";
import { useTheme } from "@/components/theme/theme-provider";
import type { useMcpApiKeys } from "@/hooks/use-mcp-api-keys";
import type { useOAuthConnections } from "@/hooks/use-oauth-connections";
import type { UserSettings } from "@/types/settings";

/**
 * 설정 우측 rail — 「현재 설정」 요약.
 *
 * 설정 화면의 rail 은 추천 콘텐츠가 아니라 **지금 내 설정 상태를 한눈에 확인**하는 자리다.
 * 그래서 규칙이 하나다: **지금 실제로 읽을 수 있는 값만 한 줄로 보여준다.**
 *
 * - 화면 테마 — 본문 세그먼트와 **같은 Theme Context**(`useTheme`)를 읽는다. rail 이 테마를 따로
 *   저장하거나 localStorage 를 다시 보지 않으므로, 본문에서 바꾸면 이 값도 같은 렌더에서 바뀐다.
 * - 서비스 로그인 연결 · 개발자 키 — 본문(`McpApiKeySettings`)이 이미 조회한 상태를 상위에서 받아
 *   그대로 센다. **rail 때문에 API 를 다시 부르지 않는다**(같은 훅 인스턴스를 공유한다).
 *   `success` 가 아니면(미설정으로 idle · loading · error) 값을 알 수 없으므로 **행 자체를 넣지 않는다** —
 *   "0개"로 적으면 "연결이 없다"는 확정 정보가 되는데, 그건 모르는 것과 다르다.
 * - `기본 공개 범위` · `보고서 완료 알림` — 08-09 에 서버 설정값이 생겨(#63) 이제 읽을 수 있다.
 *   본문과 **같은 훅 인스턴스**의 확정값을 상위에서 받아 쓰므로 rail 때문에 요청이 늘지 않고,
 *   본문에서 저장에 성공한 순간 같은 렌더에서 함께 바뀐다. 아직 읽지 못했으면(`null`) 위 규칙대로
 *   행을 넣지 않는다 — 기본값을 적으면 사용자가 고른 값처럼 읽히기 때문.
 *
 * 넣지 않은 값:
 * - `아침 브리핑 주제` — 사용자가 직접 고르지 않는다. LLM Wiki 가 분석한 상위 관심사를 기준으로
 *   자동 생성되는 흐름이라 선택 UI·요약 자체가 없다.
 * - 목업(settings.html)의 우측 rail 은 요금제(플랜) 카드인데 플랜 API 가 없고, 목업 자신도 한도 수치를
 *   "팀 결정 대기"로 표시해 두었다 — 그대로 옮기면 정해지지 않은 숫자를 사실처럼 보여주게 된다.
 *
 * 디자인·반응형은 다른 rail(홈 `SideRight` · `/reports` · `/notifications`)과 같다:
 * 300px · sticky · 1240px 미만 숨김, `.rpanel`(radius 14 · border · bg-card · px-4 py-[15px]),
 * 제목 13px/700, `.rstat` 행(라벨 ↔ 값, 12.5px, 위 구분선, 첫 행은 선 없음).
 */
export function SettingsRail({
  mcpConfigured,
  keys,
  connections,
  settings,
}: {
  mcpConfigured: boolean;
  keys: ReturnType<typeof useMcpApiKeys>;
  connections: ReturnType<typeof useOAuthConnections>;
  /** 서버가 확정한 보고서 설정. 아직 읽지 못했으면 null → 해당 행을 넣지 않는다. */
  settings: UserSettings | null;
}) {
  const { mode } = useTheme();

  // 확정된 목록일 때만 센다. null = "아직/끝내 알 수 없음"이고 그 행은 렌더하지 않는다.
  const activeConnections =
    connections.status === "success"
      ? connections.data.filter((connection) => connection.status === "active").length
      : null;
  const activeKeys =
    keys.status === "success"
      ? keys.data.items.filter((key) => key.status === "active").length
      : null;

  return (
    <aside
      aria-label="현재 설정 요약"
      className="sticky top-4 flex w-[300px] shrink-0 flex-col gap-3.5 max-[1240px]:hidden"
    >
      <section className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
        <h2 className="mb-[15px] text-[13px] font-bold text-foreground">현재 설정</h2>

        {/* 테마는 항상 읽을 수 있다(서버 값이 아니라 클라이언트 상태) → 언제나 첫 행. */}
        <Row label="화면 테마" value={themeModeLabel(mode)} first />

        {settings !== null && (
          <>
            <Row label="기본 공개 범위" value={reportVisibilityLabel(settings.defaultCardVisibility)} />
            <Row
              label="보고서 완료 알림"
              value={reportNotificationLabel(settings.reportReadyNotification)}
            />
          </>
        )}

        {activeConnections !== null && (
          <Row
            label="서비스 로그인 연결"
            value={activeConnections > 0 ? `${activeConnections}개 연결됨` : "없음"}
          />
        )}
        {activeKeys !== null && (
          <Row label="개발자 키" value={activeKeys > 0 ? `${activeKeys}개 사용 중` : "없음"} />
        )}

        {/* 미설정은 일시적인 상태가 아니라 확정된 환경 사실이라, 행이 왜 없는지만 한 줄로 밝힌다. */}
        {!mcpConfigured && (
          <p className="mt-3 text-[11.5px] leading-[1.6] text-muted-foreground">
            MCP 서버가 설정되면 외부 AI 연결 상태도 여기에서 볼 수 있어요.
          </p>
        )}
      </section>
    </aside>
  );
}

/** .rstat — 라벨 ↔ 값 한 줄. 첫 행은 위 구분선을 없앤다(handoff `:first-of-type` 규칙). */
function Row({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-t border-border py-2 text-[12.5px] text-ink-mid ${
        first ? "border-t-0 pt-px" : ""
      }`}
    >
      <span className="shrink-0">{label}</span>
      <b className="min-w-0 truncate font-bold text-foreground">{value}</b>
    </div>
  );
}
