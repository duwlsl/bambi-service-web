"use client";

import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/components/auth/use-auth";
import { resolveErrorMessage } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";
import { updateUserSettings } from "@/lib/repositories/settings";
import type {
  UpdateUserSettingsRequest,
  UserSettings,
  UserSettingsField,
} from "@/types/settings";

/**
 * 사용자 설정(보고서 기본 공개 범위 · 보고서 완료 알림) 조회·저장 훅.
 *
 * **화면이 값을 따로 들고 있지 않는다.** 표시값은 인증 상태(`useAuth().user`)에서 매 렌더 파생하고,
 * 저장 성공 시 PATCH 응답(갱신된 UserSummary)으로 그 인증 상태를 교체한다. 그래서
 * - 저장이 실패하면 바꿀 상태가 없어 **화면이 저장된 것처럼 남을 수 없다**(요구된 실패 처리).
 * - 서버가 확정한 값만 화면에 뜬다(낙관 반영 없음 — `useCardVisibility` 와 같은 규칙).
 * - 헤더 등 다른 화면의 사용자 정보도 같은 상태를 보므로 따로 동기화할 필요가 없다.
 *
 * 조회는 별도 요청이 아니다 — 전용 GET 이 없고 `GET /api/auth/me` 가 두 필드를 함께 주므로
 * (types/settings.ts 참조) 이미 끝난 인증 복구 결과를 그대로 읽는다. 설정 화면 진입 때문에
 * 요청이 추가로 나가지 않는다.
 *
 * 상태 대응:
 * - 조회 중 / 조회 실패(인증 복구 실패) → 설정 화면의 인증 4분기(스켈레톤·복원오류)가 담당한다.
 * - `settings === null` → 인증은 됐는데 응답에 설정 필드가 없는 경우(구버전 백엔드). 컨트롤을
 *   렌더하지 않고 호출부가 안내 + 재조회를 제공한다. **`undefined` 를 기본값으로 채우지 않는다** —
 *   PRIVATE/알림 켜짐을 "사용자가 고른 값"인 양 보여주면 안 되기 때문(설정 화면의 기존 원칙).
 */
export type UseUserSettings = {
  /** 서버가 확정한 현재 설정. 응답에 설정 필드가 없으면 null(= 아직 알 수 없음). */
  settings: UserSettings | null;
  /**
   * 저장 중인 항목 — "저장 중…" 문구를 **그 행에만** 붙이기 위한 값이다.
   * 컨트롤 비활성 판단에는 쓰지 않는다(그건 `saving`) — 아래 주석 참조.
   */
  savingField: UserSettingsField | null;
  /**
   * 저장이 하나라도 진행 중인지. **두 컨트롤을 함께 잠그는 데 쓴다.**
   *
   * 저장은 한 번에 하나만 나간다(아래 ref 락). 그래서 저장 중인 행만 잠그면 다른 행은 눌리는데
   * 요청은 락에 막혀 나가지 않는, **아무 일도 일어나지 않는 클릭**이 된다(2026-08-09 실측:
   * 공개범위 저장 중 알림 토글 클릭 → PATCH 0건, 화면·안내 변화 없음). 사용자는 껐다고 믿지만
   * 서버는 그대로다. 락과 화면을 같은 규칙으로 맞춰 눌리지 않게 한다.
   */
  saving: boolean;
  /** 마지막으로 저장에 성공한 항목(성공 안내용). 다음 저장 시작 시 지워진다. */
  savedField: UserSettingsField | null;
  /** 저장 실패 문구(code 매핑, 서버 원문 아님). 성공·재시도 시 지워진다. */
  errorMessage: string | null;
  /** 실패한 항목 — 오류 문구를 그 행 아래에 붙이기 위한 키. */
  errorField: UserSettingsField | null;
  /** 한 항목만 저장한다. 저장 중에는 추가 요청을 받지 않는다. */
  save: (field: UserSettingsField, patch: UpdateUserSettingsRequest) => void;
  /** 설정을 못 읽었을 때(구버전 응답) 인증 상태를 다시 불러온다. */
  reload: () => void;
};

export function useUserSettings(): UseUserSettings {
  const { user, refreshAuth, setAuthenticatedUser } = useAuth();
  const [savingField, setSavingField] = useState<UserSettingsField | null>(null);
  const [savedField, setSavedField] = useState<UserSettingsField | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<UserSettingsField | null>(null);
  // ref 락 — state 반영을 기다리지 않으므로 Enter 연타·연속 클릭도 즉시 막힌다.
  const lock = useRef(false);

  // 두 필드가 **함께** 있을 때만 설정을 읽은 것으로 본다. 하나만 오는 응답은 없지만
  // (같은 DTO 에서 함께 채워진다) 한쪽만 있다고 나머지를 기본값으로 지어내지 않는다.
  const settings: UserSettings | null =
    user?.defaultCardVisibility !== undefined && user?.reportReadyNotification !== undefined
      ? {
          defaultCardVisibility: user.defaultCardVisibility,
          reportReadyNotification: user.reportReadyNotification,
        }
      : null;

  const save = useCallback(
    (field: UserSettingsField, patch: UpdateUserSettingsRequest) => {
      if (lock.current) return; // 저장 중 중복 요청 차단
      lock.current = true;
      setSavingField(field);
      setSavedField(null);
      setErrorMessage(null);
      setErrorField(null);
      void updateUserSettings(patch)
        .then((updated) => {
          // 서버가 확정한 사용자 요약으로 인증 상태를 교체 → 표시값이 이 응답을 따라간다.
          setAuthenticatedUser(updated);
          setSavedField(field);
        })
        .catch((err: unknown) => {
          // 화면 값은 건드리지 않는다 — 인증 상태가 그대로라 이전 값이 그대로 보인다.
          // AUTH_INVALID_TOKEN 은 공통 client 가 토큰 제거 + 만료 이벤트를 이미 냈고,
          // AuthProvider 가 guest 로 바꾸면 설정 화면이 접근 제한으로 전환된다(§4·§5).
          const code = err instanceof ApiError ? err.code : undefined;
          setErrorMessage(resolveErrorMessage(code));
          setErrorField(field);
        })
        .finally(() => {
          lock.current = false;
          setSavingField(null);
        });
    },
    [setAuthenticatedUser],
  );

  const reload = useCallback(() => {
    void refreshAuth();
  }, [refreshAuth]);

  return {
    settings,
    savingField,
    saving: savingField !== null,
    savedField,
    errorMessage,
    errorField,
    save,
    reload,
  };
}
