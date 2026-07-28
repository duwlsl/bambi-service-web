"use client";

import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import type { WikiDocumentsState } from "@/hooks/use-wiki-documents";
import { filterWikiDocuments } from "@/lib/wiki";
import type { WikiDocument, WikiInterest } from "@/types/wiki";

/**
 * [내가 저장한 자료](LLM Wiki 문서) 섹션.
 * 전체 문서에서 schema 를 방어적으로 제외하고, 관심사가 선택되면 그 documentIds 로 필터한다.
 * documentKind 는 필터·schema 제외에만 쓰고 사용자 UI(종류 칩)로는 노출하지 않는다(concept·entity·document 동일 렌더).
 */
export function WikiDocuments({
  state,
  selectedInterest,
  onClearFilter,
}: {
  state: WikiDocumentsState & { refetch: () => void };
  selectedInterest: WikiInterest | null;
  onClearFilter: () => void;
}) {
  if (state.status === "loading") {
    return (
      <section aria-label="내가 저장한 자료">
        <SectionHeader selectedInterest={selectedInterest} count={null} onClearFilter={onClearFilter} />
        <FeedSkeleton />
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section aria-label="내가 저장한 자료">
        <SectionHeader selectedInterest={selectedInterest} count={null} onClearFilter={onClearFilter} />
        <StateView
          role="alert"
          className="min-h-[240px]"
          icon={<IconAlert />}
          title="자료를 불러오지 못했어요"
          description="일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요."
          actions={[{ label: "다시 시도", onClick: state.refetch, variant: "primary" }]}
        />
      </section>
    );
  }

  const rawDocuments = state.status === "success" ? state.data : [];
  const documents = filterWikiDocuments(rawDocuments, selectedInterest);

  return (
    <section aria-label="내가 저장한 자료">
      <SectionHeader
        selectedInterest={selectedInterest}
        count={documents.length}
        onClearFilter={onClearFilter}
      />
      {documents.length === 0 ? (
        <StateView
          className="min-h-[240px]"
          icon={<IconEmptyDoc />}
          title={selectedInterest ? "이 관심사에 연결된 자료가 없어요" : "아직 저장한 자료가 없어요"}
          description={
            selectedInterest
              ? "다른 관심사를 선택하거나 전체 자료를 확인해 보세요."
              : "관심 자료를 저장하면 AI가 정리한 문서가 여기에 쌓여요."
          }
          actions={
            selectedInterest
              ? [{ label: "전체 자료 보기", onClick: onClearFilter, variant: "primary" }]
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.documentId} doc={doc} />
          ))}
        </div>
      )}
    </section>
  );
}

function SectionHeader({
  selectedInterest,
  count,
  onClearFilter,
}: {
  selectedInterest: WikiInterest | null;
  count: number | null;
  onClearFilter: () => void;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold tracking-[-0.01em] text-foreground">내가 저장한 자료</h2>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-mid">
        <span>
          {selectedInterest ? (
            <>
              <b className="font-semibold text-signal-ink">‘{selectedInterest.topic}’</b> 관련 자료
            </>
          ) : (
            "전체 자료"
          )}
          {count !== null && <span className="text-muted-foreground"> · {count}개</span>}
        </span>
        {selectedInterest && (
          <button
            type="button"
            onClick={onClearFilter}
            className="focus-ring rounded-full border border-border bg-card px-2.5 py-0.5 text-[12px] font-semibold text-ink-mid hover:bg-background"
          >
            전체 보기
          </button>
        )}
      </div>
    </div>
  );
}

function DocumentCard({ doc }: { doc: WikiDocument }) {
  return (
    <article className="rounded-[14px] border border-border bg-card px-[18px] py-[15px]">
      {/* documentKind 종류 칩은 노출하지 않는다(concept·entity·document 동일 카드 구조) */}
      <div className="text-[14.5px] leading-[1.45] font-bold tracking-[-0.01em] text-foreground">
        {doc.title}
      </div>

      {/* summary 는 null 이면 상태 문구로 대체한다 */}
      {doc.summary !== null ? (
        <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-mid">{doc.summary}</p>
      ) : (
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-muted-foreground italic">
          요약이 아직 준비되지 않았어요.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
        {/* domain 은 null 이면 칩을 숨긴다 */}
        {doc.domain !== null && (
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            {doc.domain}
          </span>
        )}
        <span>출처 {doc.sourceCount}</span>
        <span aria-hidden="true">·</span>
        <span>업데이트 {formatUpdatedAt(doc.updatedAt)}</span>
      </div>
    </article>
  );
}

/** ISO → YYYY.MM.DD(로컬). member 데이터라 클라이언트 렌더 시점에만 표시된다(SSR 미스매치 없음). */
function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${mm}.${dd}`;
}
