"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/constants/auth";
import { ERROR_CODES, resolveErrorMessage } from "@/constants/errors";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { ApiError } from "@/lib/api-client";
import { changePassword } from "@/lib/auth";

const FIELD_CLASS =
  "h-11 rounded-[10px] border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground";

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/**
 * 비밀번호 변경 모달 — 목업 settings.html 의 `#pw-modal`(현재/새/확인 3필드).
 * 계약: `POST /api/auth/password` body `{ currentPassword, newPassword }` (2026-08-09 실측, #62).
 *
 * 확인 재입력은 **서버 필드가 아니다.** 백엔드 DTO 가 두 필드뿐이라 일치 검증은 여기서 끝내고
 * 서버로는 보내지 않는다(types/auth.ts `ChangePasswordRequest`).
 *
 * 보안·로깅: 입력값·요청 body 를 어디에도 기록하지 않는다. 실패는 `ApiError.code` 로만 분기하고
 * 서버 `error.message` 원문도 노출하지 않는다(§3·§4). 자동완성은 용도에 맞춰
 * `current-password` / `new-password` 로 지정해 비밀번호 관리자가 올바로 동작하게 한다.
 *
 * 호출부가 열릴 때만 마운트한다(`{open && <PasswordChangeModal/>}`) — 매 오픈마다 새로 마운트돼
 * 입력값이 항상 빈 상태로 시작하고, effect 안에서 리셋할 필요가 없다(ProfileEditModal 과 같은 규칙).
 * 성공 시엔 모달을 닫아 입력값을 언마운트로 비우고, 성공 안내는 호출부(설정 화면 계정 행)가 보여준다.
 */
export function PasswordChangeModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  /** 변경 성공 시 — 성공 안내는 호출부가 화면에 남긴다(모달은 닫힌다). */
  onChanged: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  // ref 락 — Enter 연타·버튼 연속 클릭은 state 반영 전에 다시 들어오므로 submitting 만으론 늦다.
  const lock = useRef(false);

  useFocusTrap(true, dialogRef);

  // ESC 로 닫기 — 제출 중에는 닫지 않는다.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  const canSubmit =
    currentPassword !== "" && newPassword !== "" && confirmPassword !== "" && !submitting;

  function close() {
    if (!submitting) onClose();
  }

  /** API 타기 전 화면 검증 — 필수 입력 · 새 비밀번호 정책 · 확인값 일치 (서버 400 은 최후 안전망). */
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (currentPassword === "") errors.currentPassword = "현재 비밀번호를 입력해 주세요.";
    if (newPassword === "") errors.newPassword = "새 비밀번호를 입력해 주세요.";
    else if (newPassword.length < PASSWORD_MIN_LENGTH)
      errors.newPassword = `새 비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요.`;
    else if (newPassword.length > PASSWORD_MAX_LENGTH)
      errors.newPassword = `새 비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해 주세요.`;
    if (confirmPassword === "") errors.confirmPassword = "새 비밀번호를 한 번 더 입력해 주세요.";
    else if (confirmPassword !== newPassword)
      errors.confirmPassword = "새 비밀번호가 서로 달라요. 다시 확인해 주세요.";
    return errors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return; // 중복 제출 차단(Enter 연타 포함)

    setFormError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    lock.current = true;
    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      // 성공 — 입력값은 언마운트로 사라진다. 토큰은 그대로 유효해 재로그인시키지 않는다(lib/auth.ts).
      onChanged();
      onClose();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ERROR_CODES.INTERNAL_ERROR;
      if (code === ERROR_CODES.AUTH_INVALID_CREDENTIALS) {
        // 이 화면에서 이 코드는 "현재 비밀번호 불일치"다(로그인 폼의 공통 문구는 맞지 않는다) →
        // 고칠 수 있는 필드에 인라인으로 붙인다(§4 VALIDATION 처리 방침과 같은 방식).
        setFieldErrors({ currentPassword: "현재 비밀번호가 일치하지 않아요." });
      } else if (code === ERROR_CODES.VALIDATION_ERROR) {
        setFieldErrors({
          newPassword: `새 비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 ${PASSWORD_MAX_LENGTH}자 이하로 입력해 주세요.`,
        });
      } else {
        // 인증 만료(AUTH_INVALID_TOKEN)·서버 오류 등 — 공통 문구. 만료면 공통 client 가 이미 토큰을
        // 지우고 만료 이벤트를 냈고, AuthProvider 가 guest 로 바꾸면 이 화면이 접근 제한으로 바뀐다.
        setFormError(resolveErrorMessage(code));
      }
      lock.current = false;
      setSubmitting(false);
    }
  }

  function fieldErrorId(name: keyof FieldErrors): string | undefined {
    return fieldErrors[name] ? `pw-${name}-error` : undefined;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-[rgba(12,14,17,.45)]"
      onClick={close}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="비밀번호 변경"
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
          noValidate
          className="w-[460px] max-w-full rounded-2xl border border-border bg-card px-6 py-[22px] shadow-[0_24px_60px_rgba(10,12,15,.28)]"
        >
          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-[16.5px] font-bold text-foreground">비밀번호 변경</span>
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              aria-label="닫기"
              className="focus-ring rounded-[7px] px-[7px] py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <PasswordField
            id="pw-current"
            label="현재 비밀번호"
            autoComplete="current-password"
            placeholder="현재 비밀번호"
            value={currentPassword}
            onChange={setCurrentPassword}
            disabled={submitting}
            error={fieldErrors.currentPassword}
            errorId={fieldErrorId("currentPassword")}
            autoFocus
          />

          <PasswordField
            id="pw-new"
            label="새 비밀번호"
            autoComplete="new-password"
            placeholder={`${PASSWORD_MIN_LENGTH}자 이상`}
            value={newPassword}
            onChange={setNewPassword}
            disabled={submitting}
            error={fieldErrors.newPassword}
            errorId={fieldErrorId("newPassword")}
          />

          <PasswordField
            id="pw-confirm"
            label="새 비밀번호 확인"
            autoComplete="new-password"
            placeholder="한 번 더 입력"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={submitting}
            error={fieldErrors.confirmPassword}
            errorId={fieldErrorId("confirmPassword")}
          />

          {/* 목업 `.pe-hint` — 정책을 미리 알려 실패 후에 알게 되지 않도록 한다. */}
          <p className="mt-1 text-[12px] leading-[1.6] text-muted-foreground">
            {PASSWORD_MIN_LENGTH}자 이상 {PASSWORD_MAX_LENGTH}자 이하, 두 입력이 일치해야 해요.
          </p>

          {formError && (
            <p role="alert" className="mt-2 text-[12.5px] leading-[1.6] text-destructive">
              {formError}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
              취소
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "변경 중…" : "변경"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/** 세 입력이 라벨·오류 연결(aria-describedby)·자동완성만 다르고 나머지는 같아 한 곳으로 묶는다. */
function PasswordField({
  id,
  label,
  autoComplete,
  placeholder,
  value,
  onChange,
  disabled,
  error,
  errorId,
  autoFocus,
}: {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  error?: string;
  errorId?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="mb-3 text-left">
      <label htmlFor={id} className="mb-[7px] block text-[13px] font-semibold text-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={PASSWORD_MAX_LENGTH}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        // 훅이 초기 포커스를 옮긴다(모달 트리거 캡처 순서 때문 — useFocusTrap 참조).
        data-autofocus={autoFocus ? "" : undefined}
        className={FIELD_CLASS}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[12px] leading-[1.55] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
