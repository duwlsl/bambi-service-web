import type { ReportSection } from "@/lib/mock/report";

/**
 * 데이터 기반 공개 본문 — 피드 공개 카드(post-us10y 등)의 상세 본문을 sections 로 렌더한다.
 * 원/달러 환율 목업 본문(report-body-mock / report-body-public-mock)과 달리 카드별로 내용이 다르므로
 * ReportDetail.bodySections 데이터로 h2 + 문단만 표시한다. 실 API 에서는 마크다운 렌더러로 대체된다.
 */
export function ReportBodySections({ sections }: { sections: ReportSection[] }) {
  return (
    <div className="md-viewer">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
