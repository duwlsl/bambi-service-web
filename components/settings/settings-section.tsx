import type { ReactNode } from "react";

/**
 * 설정 화면의 섹션·행 레이아웃 — 목업 settings.html 의 `.set-sec` / `.srow` 구조.
 * 본문(`SettingsScreen`)과 `보고서` 섹션이 같은 행 리듬을 쓰도록 여기 1곳에 둔다.
 */

/**
 * .set-sec — 섹션 카드(제목 st2 + 행들).
 * 제목은 heading 으로 둔다 — 같은 위계의 「외부 AI 연결」 섹션이 이미 h2 라, div 로 두면
 * 세 섹션이 문서 구조에서 서로 다른 층에 놓인다(보이는 모습은 그대로다).
 */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3.5 rounded-2xl border border-border bg-card px-[22px] py-1.5">
      <h2 className="pt-4 pb-1 text-[14.5px] font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/**
 * .srow — 좌측 라벨(t2)+설명(d2), 우측 컨트롤. 좁은 폭에서는 컨트롤이 아래로 자연 wrap.
 *
 * `status` 는 설명 아래에 붙는 보조 문구 슬롯이다 — 행마다 쓰임이 다르다(보고서 행은 저장 실패
 * 안내, 계정 행은 비밀번호 변경 결과). 없으면 아무것도 그리지 않는다. 컨트롤 옆이 아니라 라벨
 * 블록 안에 두어야 320px 에서 컨트롤을 밀어내지 않고, 행이 위아래로만 늘어난다.
 */
export function SettingsRow({
  label,
  description,
  control,
  status,
}: {
  label: string;
  description?: ReactNode;
  control?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-border py-[15px] last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-foreground">{label}</div>
        {description != null && (
          <div className="mt-[3px] text-[12px] leading-[1.55] text-muted-foreground">
            {description}
          </div>
        )}
        {status}
      </div>
      {control}
    </div>
  );
}
