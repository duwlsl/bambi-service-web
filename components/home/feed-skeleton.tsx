/**
 * 피드 데이터 로딩 스켈레톤 — 인증 확정 후 피드/내 보고서 데이터를 불러오는 동안 표시한다.
 * 인증 복구 로딩(home-screen HomeSkeleton)과 구분되는 "데이터 로딩" 자리다.
 * 문구·개인 정보 없이 중립 placeholder 만 노출한다.
 */
export function FeedSkeleton() {
  const bar = "rounded-md bg-[var(--skel1)]";
  return (
    <div className="min-h-[320px]">
      <div className="animate-pulse" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="mb-4 overflow-hidden rounded-[14px] border border-border bg-card px-[18px] pt-4 pb-4"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div className={`h-[38px] w-[38px] shrink-0 rounded-full ${bar}`} />
              <div className="min-w-0 flex-1">
                <div className={`mb-1.5 h-3.5 w-[45%] max-w-40 ${bar}`} />
                <div className={`h-3 w-[30%] max-w-28 ${bar}`} />
              </div>
            </div>
            <div className="ml-12 max-w-full">
              <div className={`mb-2 h-5 w-[85%] ${bar}`} />
              <div className={`mb-2 h-4 w-full ${bar}`} />
              <div className={`mb-3 h-4 w-[65%] ${bar}`} />
              {i === 0 && <div className={`mb-1 h-[180px] w-full ${bar}`} />}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        불러오는 중…
      </span>
    </div>
  );
}
