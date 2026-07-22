import { BrandHeader } from "@/components/ui/brand-header";
import { IconSearch } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import { ERROR_MESSAGES } from "@/constants/errors";

/**
 * 404 — 라우트 매칭 실패 및 notFound() 진입 지점(예: 미등록 리포트 id, app/report/[id]/page.tsx).
 * 전용 목업이 없어 공통 상태 패턴(StateView)을 쓰고, 문구는 공통 에러 문구 단일 소스
 * (constants/errors.ts NOT_FOUND)를 사용한다(§4). 임의 신규 디자인을 만들지 않는다.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <BrandHeader />
      <div className="flex flex-1 items-center justify-center px-5 py-24">
        <StateView
          className="w-[440px] max-w-full"
          icon={<IconSearch />}
          title="페이지를 찾을 수 없어요"
          description={ERROR_MESSAGES.NOT_FOUND}
          actions={[{ label: "홈으로", href: "/", variant: "primary" }]}
        />
      </div>
    </div>
  );
}
