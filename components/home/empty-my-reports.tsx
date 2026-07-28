"use client";

import { IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";

/**
 * 홈 [내 보고서] 완전 Empty 온보딩 — 인증된 사용자가 PREPARING·ERROR·READY 모두 0건일 때만 노출한다.
 * (하나라도 있으면 각 상태 UI 를 쓰고, loading·조회 오류일 때는 이 화면을 보여주지 않는다 — 상위 홈이 조건 판단.)
 *
 * design-handoff variants/home-my-reports-states.html 의 "받은 보고서 없음(empty-never)" 목업 카피·구성 준수.
 * CTA 는 실제 경로만 사용한다:
 *  - "＋ 관심 자료 추가": 실제 저장 모달(AddMaterialModal) 열기 콜백(onAddMaterial).
 *  - "관심사 관리": 실제 라우트 /wiki.
 * ⚠ "저장하면 바로 보고서가 만들어져요"처럼 즉시 생성 API 가 있는 듯한 문구·CTA 는 쓰지 않는다(생성 계약 미확정).
 */
export function EmptyMyReports({ onAddMaterial }: { onAddMaterial: () => void }) {
  return (
    <StateView
      className="min-h-[320px]"
      icon={<IconEmptyDoc />}
      title="아직 받은 보고서가 없어요"
      description={
        <>
          등록한 관심사와 관심 자료를 바탕으로 매일 아침 브리핑이 만들어져요.
          <br />
          관심 자료를 추가하면 다음 브리핑부터 반영돼요.
        </>
      }
      actions={[
        { label: "＋ 관심 자료 추가", onClick: onAddMaterial, variant: "primary" },
        { label: "관심사 관리", href: "/wiki", variant: "ghost" },
      ]}
    />
  );
}
