import Link from "next/link";

/** 기존 자료 목록 자리를 대체하는 사용자용 LLM Wiki 진입 카드. */
export function LlmWikiEntry() {
  return (
    <section aria-labelledby="llm-wiki-entry-title">
      <div className="relative overflow-hidden rounded-[18px] border border-border bg-card px-5 py-5 sm:px-6 sm:py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-[500px]">
            <div className="mb-3 flex items-center gap-3">
              <WikiMark />
              <div>
                <h2
                  id="llm-wiki-entry-title"
                  className="text-[17px] font-bold tracking-[-0.01em] text-foreground"
                >
                  나의 LLM Wiki
                </h2>
                <p className="text-[11.5px] font-semibold tracking-wide text-primary uppercase">
                  Personal knowledge graph
                </p>
              </div>
            </div>
            <p className="text-[13px] leading-[1.7] text-ink-mid">
              저장한 자료에서 AI가 정리한 개념과 대상의 연결을 살펴보고, 각 노드가 어떤
              원본을 근거로 만들어졌는지 확인할 수 있어요.
            </p>
          </div>

          <Link
            href="/wiki/graph"
            className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[11px] bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:brightness-[.96]"
          >
            LLM Wiki 열기
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Entity와 Concept 연결을 단순화한 장식 아이콘. */
function WikiMark() {
  return (
    <span
      aria-hidden="true"
      className="relative block h-11 w-11 shrink-0 rounded-[13px] border border-primary/20 bg-primary/10"
    >
      <span className="absolute top-[9px] left-[9px] h-2.5 w-2.5 rounded-full bg-primary" />
      <span className="absolute right-[8px] bottom-[8px] h-3 w-3 rounded-full border-2 border-primary bg-card" />
      <span className="absolute top-[20px] left-[17px] h-px w-[15px] origin-left rotate-[35deg] bg-primary/70" />
    </span>
  );
}
