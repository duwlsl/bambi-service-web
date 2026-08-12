"use client";

import { SegmentedControl } from "@/components/settings/segmented-control";
import { REPORT_VISIBILITY_OPTIONS } from "@/components/settings/report-settings-options";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import type { useUserSettings } from "@/hooks/use-user-settings";
import type { UserSettingsField } from "@/types/settings";

/**
 * 설정 본문의 `보고서` 섹션 — 기본 공개 범위 · 완료 알림 (service-api #63, V17).
 *
 * 이 섹션은 오래 비어 있었다: 서버에 설정값도 저장 API 도 없어서 "자리만 잡아두는 disabled 토글·
 * 가짜 기본값"을 두지 않는다는 원칙에 따라 아예 렌더하지 않았다. 08-09 에 두 컬럼과 PATCH 가
 * 배포되면서 **실제 값과 저장 경로가 생겨** 이제 렌더한다.
 *
 * 저장 규칙(훅과 함께 읽을 것 — `hooks/use-user-settings.ts`):
 * - 표시값은 서버가 확정한 값이다. 낙관 반영이 없으므로 **저장이 실패하면 화면도 이전 값 그대로**다.
 * - **화면에는 성공·진행 문구를 그리지 않는다.** 세그먼트 선택과 스위치 위치가 서버 확정값으로
 *   바뀌는 것 자체가 시각 피드백이고, 그 위에 문구를 얹으면 다음 저장 전까지 남아 잔상이 된다.
 * - 대신 **`sr-only` live region 으로 성공을 낭독**한다. 저장 중에는 컨트롤이 disabled 가 되어
 *   포커스가 풀리므로, `aria-checked` 변화만으로는 보이지 않는 사용자에게 결과가 닿지 않는다.
 * - 실패는 시각적으로도 알린다 — 그때는 컨트롤이 안 움직이는 게 유일한 신호라 이유를 말해야 한다.
 * - 한 번에 **바꾼 항목 하나만** PATCH 로 보낸다(부분 수정) — 다른 항목을 함께 실어 보내지 않으니
 *   화면이 들고 있던 값으로 서버의 다른 설정을 덮어쓸 수 없다.
 * - 저장 중에는 **두 컨트롤이 함께 잠긴다.** 저장이 한 번에 하나만 나가므로(훅의 ref 락),
 *   저장 중인 행만 잠그면 다른 행은 눌려도 요청이 안 나가는 무음 클릭이 된다. 같은 행 연타와
 *   서로 다른 두 행의 빠른 연속 변경이 모두 같은 규칙으로 막힌다. 응답이 뒤섞일 여지도 없다 —
 *   PATCH 가 동시에 떠 있는 상태 자체가 생기지 않으므로 늦게 온 응답이 다른 필드를 되돌릴 수 없다.
 *
 * 설정을 아직 읽지 못한 경우(`settings === null`)에는 컨트롤을 만들지 않고 안내 + 다시 불러오기만
 * 둔다. 기본값으로 채워 보여주면 사용자가 "이미 그렇게 설정돼 있다"고 읽기 때문이다.
 */
/** 저장 성공 시 낭독할 문구 — 어느 항목이 저장됐는지 항목명까지 밝힌다. */
const SAVED_ANNOUNCEMENT: Record<UserSettingsField, string> = {
  defaultCardVisibility: "기본 공개 범위 설정이 저장되었습니다.",
  reportReadyNotification: "보고서 완료 알림 설정이 저장되었습니다.",
  changeHistoryEnabled: "변경사항 비교 설정이 저장되었습니다.",
};

export function ReportSettings({ settings: s }: { settings: ReturnType<typeof useUserSettings> }) {
  const { settings, saving, savedField, errorMessage, errorField, save, reload } = s;

  return (
    <SettingsSection title="보고서">
      {/*
        저장 성공 낭독 전용 영역. **항상 마운트한 채 내용만 바꾼다** — 저장 성공 시점에 요소를
        새로 끼워 넣으면 live region 이 등록되기 전이라 낭독이 누락될 수 있다.
        `aria-atomic` 으로 바뀐 부분이 아니라 문장 전체를 읽게 한다. `sr-only` 라 화면에는
        보이지 않고 빈 줄도 만들지 않는다.
      */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {savedField === null ? "" : SAVED_ANNOUNCEMENT[savedField]}
      </p>

      {settings === null ? (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 py-[15px]">
          <p className="min-w-0 flex-1 text-[12.5px] leading-[1.6] text-muted-foreground">
            보고서 설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={reload}
            className="focus-ring inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-background"
          >
            다시 불러오기
          </button>
        </div>
      ) : (
        <>
          <SettingsRow
            label="기본 공개 범위"
            description="새로 만들어지는 보고서에 적용돼요. 공개로 두면 다른 사용자가 내 보고서를 보고 반응할 수 있어요. 보고서마다 따로 바꿀 수도 있어요."
            status={
              <RowStatus
                field="defaultCardVisibility"
                errorMessage={errorMessage}
                errorField={errorField}
              />
            }
            control={
              <SegmentedControl
                label="보고서 기본 공개 범위"
                options={REPORT_VISIBILITY_OPTIONS}
                value={settings.defaultCardVisibility}
                // 저장 중에는 **두 컨트롤을 함께** 잠근다(`saving`, 이 행만이 아니라).
                // 저장은 한 번에 하나만 나가므로, 잠그지 않으면 눌려도 요청이 안 나가는
                // 무음 클릭이 된다 — 훅의 `saving` 주석 참조.
                disabled={saving}
                onChange={(next) => {
                  if (next === settings.defaultCardVisibility) return; // 같은 값 = 저장할 것 없음
                  save("defaultCardVisibility", { defaultCardVisibility: next });
                }}
              />
            }
          />

          <SettingsRow
            label="보고서 완료 알림"
            description="보고서가 준비되면 알림으로 알려드려요. 꺼두면 알림이 만들어지지 않아요."
            status={
              <RowStatus
                field="reportReadyNotification"
                errorMessage={errorMessage}
                errorField={errorField}
              />
            }
            control={
              <Switch
                label="보고서 완료 알림"
                checked={settings.reportReadyNotification}
                disabled={saving}
                onChange={(next) => save("reportReadyNotification", { reportReadyNotification: next })}
              />
            }
          />

          {/*
            변경사항 비교(Delta) — 계정 단위 설정 (service-api #74 · V19, 김기용 08-10 요청으로
            요청 단위 토글을 대체). undefined = 구버전 백엔드 응답이라 행 자체를 그리지 않는다 —
            기본값을 지어내 "이미 꺼져 있다"로 보여주지 않는 이 화면의 기존 원칙.
            문구는 완료 시점·소요 시간을 약속하지 않는다("3~5분" 류 금지 규약).
          */}
          {settings.changeHistoryEnabled !== undefined && (
            <SettingsRow
              label="변경사항 비교로 보기"
              description="이 설정을 켜면 아침 보고서와 관심사 보고서를 포함해 앞으로 생성되는 보고서를, 지난 보고서 이후 새로 생기거나 달라진 내용 중심으로 정리해 드려요. 주제를 처음 받는 경우에는 전체 내용으로 만들어져요."
              status={
                <RowStatus
                  field="changeHistoryEnabled"
                  errorMessage={errorMessage}
                  errorField={errorField}
                />
              }
              control={
                <Switch
                  label="변경사항 비교로 보기"
                  checked={settings.changeHistoryEnabled}
                  disabled={saving}
                  onChange={(next) => save("changeHistoryEnabled", { changeHistoryEnabled: next })}
                />
              }
            />
          )}
        </>
      )}
    </SettingsSection>
  );
}

/**
 * 행별 저장 **실패**만 그린다. 저장에 실패하면 컨트롤이 움직이지 않는 것이 유일한 신호인데,
 * 그것만으로는 "안 눌렸나"와 "실패했나"를 구분할 수 없어 `role="alert"` 로 이유를 말해 준다.
 * 성공·진행은 그리지 않는다(컨트롤 움직임 + 위쪽 sr-only live region 이 담당).
 */
function RowStatus({
  field,
  errorMessage,
  errorField,
}: {
  field: UserSettingsField;
  errorMessage: string | null;
  errorField: UserSettingsField | null;
}) {
  if (errorMessage === null || errorField !== field) return null;
  return (
    <p role="alert" className="mt-1.5 text-[12px] leading-[1.55] text-destructive">
      {errorMessage} 저장되지 않아 이전 설정이 그대로예요.
    </p>
  );
}

/**
 * 목업 `.sw` 스위치 (38×22 · knob 18 · on 이면 --signal). 이 화면에서만 쓰므로 여기 둔다
 * (§11 — 한 번 쓰이는 작은 UI 를 무조건 공통 컴포넌트로 빼지 않는다).
 *
 * `role="switch"` 대신 실제 `<button>` 에 `aria-checked` 를 얹어 Space/Enter·포커스 링을
 * 브라우저 기본 동작으로 얻는다. 상태를 색만으로 전달하지 않도록 knob 위치도 함께 움직인다.
 */
function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-[left] ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
