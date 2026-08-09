"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/use-auth";
import { Orb } from "@/components/brand/orb";
import { AddMaterialModal } from "@/components/home/add-material-modal";
import { HomeNav } from "@/components/home/home-nav";
import { SideLeft } from "@/components/home/side-left";
import { useTheme } from "@/components/theme/theme-provider";
import { PageState } from "@/components/ui/page-state";
import { IconAlert } from "@/components/ui/state-icons";
import { McpApiKeySettings, MCP_SERVER_URL } from "@/components/settings/mcp-api-key-settings";
import { PasswordChangeModal } from "@/components/settings/password-change-modal";
import { ReportSettings } from "@/components/settings/report-settings";
import { SegmentedControl } from "@/components/settings/segmented-control";
import { SettingsRail } from "@/components/settings/settings-rail";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { THEME_MODE_OPTIONS } from "@/components/settings/theme-modes";
import { useMcpApiKeys } from "@/hooks/use-mcp-api-keys";
import { useOAuthConnections } from "@/hooks/use-oauth-connections";
import { useUserSettings } from "@/hooks/use-user-settings";

const SETTINGS_MENU_LABEL = "설정";

/**
 * 설정 — member 전용(§15). 화면 구조·스타일은 docs/design-handoff/product/settings.html 의
 * `.set-sec`/`.srow` 섹션-행 구조를 따른다. 기능은 지금 실제 지원 가능한 것만 포함한다:
 * 화면 테마(라이트/다크/시스템), 보고서 설정(기본 공개 범위·완료 알림), MCP 연결 키,
 * 계정 이메일(읽기 전용, auth user), 비밀번호 변경, 로그아웃.
 *
 * 본문 정보 위계는 `화면` → `보고서` → `외부 AI 연결` → `계정` 순이다.
 *
 * ⚡ 2026-08-09 — `보고서` 섹션과 `비밀번호 변경`이 들어왔다. 둘 다 그전까지는 "서버에 설정값도
 * 저장 API 도 없다"는 이유로 렌더하지 않던 자리다(자리만 잡아두는 disabled 토글·가짜 기본값을
 * 두지 않는다는 원칙). service-api #62·#63 배포로 **실제 값과 저장 경로가 생겨** 이제 만든다:
 *   POST  /api/auth/password          (현재/새 비밀번호, 확인 재입력은 프론트 검증)
 *   PATCH /api/users/me/settings      (부분 수정 · 조회는 GET /api/auth/me 의 두 필드)
 * 계정 섹션은 여전히 `Danger Zone`(회원 탈퇴)이 마지막 섹션으로 들어갈 위계·간격을 유지한다
 * (탈퇴 API 가 없으므로 버튼은 미리 만들지 않는다). 목업의 이메일 변경·브리핑 시간도 API 가 없어 제외.
 *
 * 목업 우측 레일(요금제 카드)은 플랜 API 가 없고 목업 자체가 한도 수치를 "팀 결정 대기"로 표시해 두어
 * 그대로 옮기지 않고, 대신 지금 읽을 수 있는 값만 요약하는 `SettingsRail`(현재 설정)을 둔다.
 *
 * 인증 상태 4분기(홈·상세와 동일 패턴): loading→스켈레톤 / error→복원오류 / guest→접근제한 / authenticated→본문.
 * 보고서 설정의 **조회 중·조회 실패는 이 4분기가 그대로 담당한다** — 현재값이 인증 복구(`GET /api/auth/me`)
 * 응답에 실려 오므로 설정 화면이 따로 조회하지 않는다(hooks/use-user-settings.ts).
 */
export function SettingsScreen() {
  const { status, refreshAuth } = useAuth();

  if (status === "loading") return <SettingsSkeleton />;
  if (status === "error") return <SettingsAuthError onRetry={refreshAuth} />;
  if (status === "guest") return <SettingsAccessRestricted />;
  return <SettingsView />;
}

/** 본문 — authenticated 에서만 도달. 계정 정보는 auth user 를 그대로 쓴다(가짜 필드 없음). */
function SettingsView() {
  const { user, logoutUser } = useAuth();
  const router = useRouter();
  const [amOpen, setAmOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwChanged, setPwChanged] = useState(false);

  const email = user?.email ?? "";

  // 외부 AI 연결 조회는 **여기서 한 번만** 한다. 본문(McpApiKeySettings)과 rail 이 같은 훅
  // 인스턴스를 나눠 쓰므로 요청이 두 번 나가지 않고, 발급·폐기 후 refetch 도 양쪽에 함께 반영된다.
  const mcpConfigured = MCP_SERVER_URL.length > 0;
  const keys = useMcpApiKeys(mcpConfigured);
  const connections = useOAuthConnections(mcpConfigured);

  // 보고서 설정도 같은 이유로 여기서 한 번만 만들어 본문과 rail 이 나눠 쓴다(추가 요청 없음).
  const userSettings = useUserSettings();

  // 로그아웃 = 로컬 토큰 제거 + guest 전환(기존 logoutUser) → 공개 홈(/)으로 이동.
  function handleLogout() {
    logoutUser();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeNav onAddOpen={() => setAmOpen(true)} />

      <div className="mx-auto max-w-[1440px]">
        <div className="flex items-start justify-center gap-[22px] px-5 pt-6 pb-14">
          <SideLeft current={SETTINGS_MENU_LABEL} footLines={[]} />

          <main className="min-w-0 max-w-[760px] flex-1">
            {/* .set-head */}
            <div className="mb-4">
              <h1 className="text-[22px] font-bold tracking-[-0.015em] text-foreground">설정</h1>
              <p className="mt-[5px] text-[13px] leading-[1.6] text-muted-foreground">
                계정, 화면 테마, 보고서 설정, 외부 AI 연결을 관리해요.
              </p>
            </div>

            {/* .set-sec — 화면 */}
            <SettingsSection title="화면">
              <SettingsRow
                label="화면 테마"
                description="시스템을 선택하면 기기 설정을 따라가요."
                control={<ThemeModeSegment />}
              />
            </SettingsSection>

            {/* .set-sec — 보고서 (기본 공개 범위 · 완료 알림). 아침 브리핑 주제 선택은 후보가
                AI 추론 관심사 + 직접 설정 관심사라 관심사를 실제로 관리하는 `/wiki` 에 있다
                (components/wiki/wiki-briefing-topics.tsx) — 여기로 다시 가져오지 않는다. */}
            <ReportSettings settings={userSettings} />

            <McpApiKeySettings
              mcpConfigured={mcpConfigured}
              keys={keys}
              connections={connections}
            />

            {/* .set-sec — 계정 (실 API 있는 항목만: 이메일 표시 · 비밀번호 변경 · 로그아웃).
                `Danger Zone`(회원 탈퇴)은 이 섹션 뒤에 붙는다 — 탈퇴 API 가 없어 아직 만들지 않는다. */}
            <SettingsSection title="계정">
              <SettingsRow label="이메일" description={<span className="break-all">{email}</span>} />
              <SettingsRow
                label="비밀번호"
                description="주기적으로 바꾸면 계정을 더 안전하게 지킬 수 있어요."
                status={
                  // 성공 안내는 모달이 닫힌 뒤 이 자리에 남는다 — 입력값은 언마운트로 비워지고,
                  // 사용자는 자기가 누른 행에서 결과를 본다. 다시 열면 안내를 지운다.
                  pwChanged ? (
                    <p aria-live="polite" className="mt-1.5 text-[12px] leading-[1.55] text-muted-foreground">
                      비밀번호를 변경했어요. 다음 로그인부터 새 비밀번호를 사용해 주세요.
                    </p>
                  ) : null
                }
                control={
                  <button
                    type="button"
                    onClick={() => {
                      setPwChanged(false);
                      setPwOpen(true);
                    }}
                    className="focus-ring inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-background"
                  >
                    비밀번호 변경
                  </button>
                }
              />
              <SettingsRow
                label="로그아웃"
                description="이 기기에서 로그아웃하고 공개 홈으로 이동해요."
                control={
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="focus-ring inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-background"
                  >
                    로그아웃
                  </button>
                }
              />
            </SettingsSection>
          </main>

          {/* 우측 rail — 지금 읽을 수 있는 설정만 요약. 본문과 같은 state 를 그대로 받는다. */}
          <SettingsRail
            mcpConfigured={mcpConfigured}
            keys={keys}
            connections={connections}
            settings={userSettings.settings}
          />
        </div>
      </div>

      <AddMaterialModal open={amOpen} onClose={() => setAmOpen(false)} />
      {/* 열릴 때만 마운트 — 입력값이 항상 빈 상태로 시작한다(모달 내부 주석 참조). */}
      {pwOpen && (
        <PasswordChangeModal
          onClose={() => setPwOpen(false)}
          onChanged={() => setPwChanged(true)}
        />
      )}
    </div>
  );
}

/**
 * 화면 테마 선택 — 공통 `SegmentedControl`(목업 `.kseg`/`.ks`)에 테마 상태만 연결한다.
 * a11y(radiogroup·roving tabindex·방향키)는 그 컴포넌트가 담당하고, 여기는 값만 잇는다.
 * 라벨은 rail 요약과 공유한다(THEME_MODE_OPTIONS) — 같은 값이 두 곳에서 다르게 보이지 않게.
 * 테마는 로컬 상태(localStorage)라 서버 저장이 없고, 그래서 저장 중 잠기는 상태가 없다.
 */
function ThemeModeSegment() {
  const { mode, setMode } = useTheme();
  return (
    <SegmentedControl label="화면 테마" options={THEME_MODE_OPTIONS} value={mode} onChange={setMode} />
  );
}

/** 인증 복원 중 — 중립 스켈레톤(개인 정보·CTA 없음). HomeNav 는 loading 상태라 로고만 렌더한다. */
function SettingsSkeleton() {
  const bar = "rounded-md bg-[var(--skel1)]";
  return (
    <div className="min-h-screen bg-background">
      <HomeNav onAddOpen={() => {}} />
      <div className="mx-auto max-w-[1440px]">
        <div className="flex items-start justify-center gap-[22px] px-5 pt-6 pb-14" aria-hidden="true">
          <main className="min-w-0 max-w-[760px] flex-1">
            <div className={`mb-5 h-6 w-24 ${bar}`} />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="mb-3.5 animate-pulse rounded-2xl border border-border bg-card px-[22px] py-4">
                <div className={`mb-4 h-4 w-16 ${bar}`} />
                <div className={`mb-2 h-9 w-full ${bar}`} />
              </div>
            ))}
          </main>
        </div>
      </div>
      <span className="sr-only" role="status">
        불러오는 중…
      </span>
    </div>
  );
}

/** 인증 복원 오류(500·네트워크) — 재시도 제공. member 화면을 대체 노출하지 않는다. */
function SettingsAuthError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <HomeNav onAddOpen={() => {}} />
      <PageState
        role="alert"
        icon={<IconAlert />}
        title="인증 상태를 확인하지 못했어요"
        description="네트워크나 서버 상태를 확인한 뒤 다시 시도해 주세요."
        actions={[
          { label: "다시 시도", onClick: onRetry, variant: "primary" },
          { label: "홈으로", href: "/", variant: "ghost" },
        ]}
      />
    </div>
  );
}

/** guest 접근 — 개인 설정이라 본문 대신 접근 제한만 안내한다(§15). 로그인 경로 제공. */
function SettingsAccessRestricted() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <HomeNav onAddOpen={() => {}} />
      <PageState
        role="alert"
        iconTone="brand"
        icon={<Orb size={22} />}
        title="로그인이 필요한 페이지예요"
        description="설정은 로그인한 사용자만 볼 수 있어요."
        actions={[
          { label: "로그인", href: "/login", variant: "primary" },
          { label: "공개 홈으로", href: "/", variant: "ghost" },
        ]}
      />
    </div>
  );
}
