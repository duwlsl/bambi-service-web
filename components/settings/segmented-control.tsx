"use client";

import { type KeyboardEvent, useRef } from "react";

/**
 * 목업 `.kseg`/`.ks` 세그먼트 컨트롤 — 설정 화면의 `화면 테마`와 `보고서 기본 공개 범위`가 공유한다.
 *
 * 선택 상태는 배경(카드)+그림자+글자색+`aria-checked` 로 함께 전달한다(색상만으로 구분하지 않음).
 * ARIA radiogroup + roving tabindex(선택 항목만 tab 진입) + 방향키/Home/End 이동을 구현한다.
 *
 * 두 사용처의 차이는 `disabled` 뿐이다: 테마는 로컬 상태라 항상 즉시 바뀌고, 공개 범위는 서버 저장이라
 * 저장 중 잠긴다. 값 타입은 제네릭으로 열어 두어 호출부가 자기 도메인 타입(ThemeMode·CardVisibility)을
 * 그대로 쓴다 — 문자열로 낮춰 받고 캐스팅하지 않는다.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  /** radiogroup 의 접근성 이름. 시각 라벨은 행(SettingsRow)이 이미 보여주므로 aria-label 로만 준다. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (disabled) return;
    const count = options.length;
    let next = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(options[next].value);
    buttonRefs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex shrink-0 gap-0.5 rounded-[9px] border border-border bg-accent p-0.5"
    >
      {options.map((option, index) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`focus-ring inline-flex items-center whitespace-nowrap rounded-[7px] px-[11px] py-[5px] text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? "bg-card text-foreground shadow-[var(--shadow)]"
                : "text-muted-foreground hover:text-ink-mid"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
