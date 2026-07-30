"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Input } from "@/components/ui/input";
import { INTEREST_NAME_MAX } from "@/constants/interests";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/**
 * 관심사 직접 추가 모달 — 목업 #ob-modal 기반. AddMaterialModal 과 동일한
 * portal + useFocusTrap(배경 inert·초기 포커스·트리거 복원) 구조를 재사용한다.
 *
 * 서버 계약(실측): name 은 자유 문자열 1~100자 → 직접 입력 topic 도 카탈로그 topic 과
 * 동일하게 저장된다. 이 모달은 API 를 호출하지 않고 **선택 목록에 추가만** 한다
 * (저장은 STEP 1 의 "계속하기" 제출에서 일괄 수행 — 관심사 저장 흐름 1곳 유지).
 *
 * 검증(전부 제출 시점): 공백만 입력 차단 · 앞뒤 공백 제거 · 한글 자모만인 입력 반려 ·
 * 문자(\p{L})·숫자(\p{N})가 하나도 없는 입력(구두점·기호·이모지만) 반려 ·
 * 이미 선택한 topic 중복 차단 · 길이는 서버 계약값(INTEREST_NAME_MAX)만 사용.
 * 언어권 제한 없음 — 영문·한글 완성형·한자·가나 등 모든 Unicode 문자와 숫자를 허용한다.
 */

/**
 * 한글 자모 낱자 판별 — 완성 음절(가–힣)이 아닌 초·중·종성 낱자.
 * 범위: Hangul Jamo(U+1100–11FF) · Compatibility Jamo(U+3130–318F) ·
 * Jamo Extended-A(U+A960–A97F)/B(U+D7B0–D7FF) · Halfwidth(U+FFA0–FFDC).
 */
const HANGUL_JAMO_PATTERN =
  /^[ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿ﾠ-ￜ]$/;

/** 자모-단독 판정에서 제외할 문자 — 공백·일반 구두점·기호(유효 문자로 세지 않음). */
const IGNORABLE_CHAR_PATTERN = /^[\s\p{P}\p{S}]$/u;

/**
 * Unicode 문자·숫자 존재 검사 — 하나도 없으면(구두점·기호·이모지만) 완성된 주제로 볼 수 없어 반려한다.
 * 언어권을 제한하지 않는다: \p{L} 은 한글 완성형·한자·가나·라틴 등 모든 문자를, \p{N} 은 모든 숫자를 포함한다.
 * ("C++"·"S&P 500"처럼 문자·숫자에 기호가 섞인 값은 통과한다. 제출 시점 전용 — IME 조합 중에는 호출하지 않는다.)
 */
const LETTER_OR_DIGIT_PATTERN = /[\p{L}\p{N}]/u;

/**
 * 유효 문자(공백·구두점·기호 제외)가 **전부 한글 자모**인지 — "ㄱㄴㄷ"·"ㅈㅅ"·"ㄱ ㅏ" 같은
 * 미완성 입력을 추가 시점에 반려하기 위한 순수 함수.
 * - 완성 음절·영문·숫자가 하나라도 섞이면 허용("ㄱㄴㄷ 테스트"는 통과). "AI"·"C" 등 약어도 통과.
 * - IME 조합 중간값이 onChange 에 자모로 잡힐 수 있으므로 입력 중에는 호출하지 않는다(제출 시점 전용).
 */
function isHangulJamoOnly(value: string): boolean {
  const meaningful = Array.from(value).filter((ch) => !IGNORABLE_CHAR_PATTERN.test(ch));
  return meaningful.length > 0 && meaningful.every((ch) => HANGUL_JAMO_PATTERN.test(ch));
}
export function InterestAddModal({
  open,
  onClose,
  selectedNames,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  /** 현재 선택된 topic 목록 — 중복 추가 차단 기준. */
  selectedNames: string[];
  /** 검증 통과한 trimmed name 을 선택 목록에 반영한다(카탈로그에 있으면 선택만). */
  onAdd: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLFormElement>(null);

  useFocusTrap(open, dialogRef);

  // ESC 로 닫기 — 네트워크 요청이 없으므로 항상 닫을 수 있다.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setValue("");
        setErrorMessage(null);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = value.trim() !== "";

  function close() {
    setValue("");
    setErrorMessage(null);
    onClose();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = value.trim();
    if (name === "") {
      setErrorMessage("관심사를 입력해 주세요.");
      return;
    }
    // 문자·숫자가 전혀 없거나(구두점·기호·이모지만) 한글 자모뿐이면 완성된 주제가 아니다.
    if (!LETTER_OR_DIGIT_PATTERN.test(name) || isHangulJamoOnly(name)) {
      setErrorMessage("완성된 단어나 주제를 입력해 주세요.");
      return;
    }
    if (selectedNames.includes(name)) {
      setErrorMessage("이미 선택한 관심사예요.");
      return;
    }
    onAdd(name);
    close();
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
          aria-label="관심사 직접 추가"
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
          className="w-[420px] max-w-full rounded-2xl border border-border bg-card px-6 py-[22px] shadow-[0_24px_60px_rgba(10,12,15,.28)]"
        >
          {/* .mhead */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[16.5px] font-bold text-foreground">관심사 직접 추가</span>
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="focus-ring rounded-[7px] px-[7px] py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground"
            >
              ✕
            </button>
          </div>
          {/* .ms — 자동 브리핑 시점을 약속하지 않는 범위의 안내만 둔다. */}
          <p className="mb-3.5 text-[13px] leading-[1.65] text-ink-mid">
            궁금한 주제를 자유롭게 적어주세요.
          </p>

          <label htmlFor="ob-add-input" className="sr-only">
            관심사 이름
          </label>
          <Input
            id="ob-add-input"
            type="text"
            placeholder="예: 테슬라 주가, 제주 항공권, Rust 릴리즈"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setErrorMessage(null);
            }}
            maxLength={INTEREST_NAME_MAX}
            data-autofocus
            className="h-[46px] rounded-[10px] bg-card px-3.5 text-sm text-foreground placeholder:text-low focus-visible:ring-[3px] focus-visible:ring-wash dark:bg-card"
          />
          {/* .mh */}
          <p className="mt-[7px] text-[11.5px] text-muted-foreground">
            구체적일수록 좋아요 — 종목명, 제품명, 키워드 모두 가능해요.
          </p>

          {errorMessage && (
            <p
              role="alert"
              aria-live="assertive"
              className="mt-2.5 rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          {/* .mfoot */}
          <div className="mt-[18px] flex justify-end gap-[9px]">
            <button
              type="button"
              onClick={close}
              className="focus-ring inline-flex items-center justify-center rounded-[10px] border border-border bg-card px-[15px] py-[9px] text-[13.5px] font-semibold whitespace-nowrap text-foreground hover:bg-background"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="focus-ring inline-flex items-center justify-center rounded-[10px] border border-primary bg-primary px-[15px] py-[9px] text-[13.5px] font-semibold whitespace-nowrap text-primary-foreground hover:brightness-[.96] disabled:opacity-50"
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
