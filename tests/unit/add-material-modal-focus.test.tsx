import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { AddMaterialModal } from "@/components/home/add-material-modal";

/**
 * 관심 자료 추가 모달 — 포커스 계약(FE-QA-004).
 *
 * 검증하는 계약은 세 가지다:
 *  1. 열면 포커스가 모달 **안으로** 들어가고, dialog·aria-modal·접근 이름이 그대로다.
 *  2. Escape · 취소 · backdrop 어느 경로로 닫아도 **열었던 그 트리거**로 포커스가 돌아온다.
 *  3. 같은 모달 인스턴스를 여러 트리거가 공유해도(홈은 상단 nav ＋ 와 Empty 카드 CTA 두 곳이
 *     하나의 AddMaterialModal 을 연다) 마지막에 **실제로 누른** 트리거로 돌아온다.
 *
 * 화면 전체(HomeScreen)가 아니라 모달 + 트리거만 세우는 이유: 검증 대상이 모달의 포커스 계약이라
 * 피드·인증 응답이 개입하면 실패 원인이 흐려진다. 트리거를 두 개 두어 3번 계약까지 여기서 덮는다.
 *
 * `#app-shell` 을 함께 세우는 건 앱 레이아웃(app/layout.tsx)과 같은 구조를 주기 위해서다 —
 * 모달이 열리는 동안 배경을 inert 처리하는 대상이고, 트리거도 그 안에 있다.
 */
function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div id="app-shell">
      <button type="button" onClick={() => setOpen(true)}>
        상단 관심 자료 추가
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        본문 관심 자료 추가
      </button>
      <AddMaterialModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

const trigger = (name: string) => screen.getByRole("button", { name });

/** backdrop = dialog 바깥의 오버레이. 사용자가 모달 밖 여백을 클릭하는 동작을 그대로 흉내 낸다. */
function backdropOf(dialog: HTMLElement): HTMLElement {
  const backdrop = dialog.parentElement?.parentElement;
  if (!backdrop) throw new Error("backdrop 을 찾지 못했다 — 모달 DOM 구조가 바뀌었는지 확인할 것");
  return backdrop;
}

describe("관심 자료 추가 모달 — 열림/닫힘 포커스", () => {
  test("열면 포커스가 모달 안으로 들어가고 dialog 속성이 유지된다", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    await user.click(trigger("상단 관심 자료 추가"));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("관심 자료 추가");
    // 초기 포커스는 첫 입력(링크 URL)이다 — 트리거에 남아 있으면 안 된다.
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByLabelText("링크(URL)")).toHaveFocus();
  });

  test("Escape 로 닫으면 열었던 트리거로 포커스가 돌아온다", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const opener = trigger("상단 관심 자료 추가");

    await user.click(opener);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  test("취소로 닫으면 열었던 트리거로 포커스가 돌아온다", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const opener = trigger("상단 관심 자료 추가");

    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  test("backdrop 클릭으로 닫으면 열었던 트리거로 포커스가 돌아온다", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const opener = trigger("상단 관심 자료 추가");

    await user.click(opener);
    await user.click(backdropOf(screen.getByRole("dialog")));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  test("트리거가 둘이어도 마지막에 누른 트리거로 돌아온다", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const top = trigger("상단 관심 자료 추가");
    const body = trigger("본문 관심 자료 추가");

    await user.click(top);
    await user.keyboard("{Escape}");
    expect(top).toHaveFocus();

    // 같은 모달 인스턴스를 다른 트리거로 다시 연다 — 앞서 연 트리거로 되돌아가면 안 된다.
    await user.click(body);
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(body).toHaveFocus();
  });

  test("트리거가 닫는 사이 사라져도 포커스가 문서 최상단으로 떨어지지 않는다", async () => {
    /**
     * 실제 경로: Empty 상태의 `＋ 관심 자료 추가` 로 열고 저장하면, 목록 refetch 로 Empty 카드가
     * 통째로 교체되어 그 버튼이 DOM 에서 사라진다. 예전에는 이때 포커스가 `<body>` 로 떨어져
     * 키보드 사용자가 문서 처음부터 Tab 해야 했다. 지금은 앱 셸(본문 시작점)이 받는다.
     */
    function VanishingTriggerHarness() {
      const [open, setOpen] = useState(false);
      const [triggerGone, setTriggerGone] = useState(false);
      return (
        <div id="app-shell">
          {!triggerGone && (
            <button type="button" onClick={() => setOpen(true)}>
              사라지는 트리거
            </button>
          )}
          <AddMaterialModal
            open={open}
            onClose={() => {
              setTriggerGone(true);
              setOpen(false);
            }}
          />
        </div>
      );
    }

    const user = userEvent.setup();
    render(<VanishingTriggerHarness />);

    await user.click(trigger("사라지는 트리거"));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("button", { name: "사라지는 트리거" })).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(document.getElementById("app-shell"));
  });
});
