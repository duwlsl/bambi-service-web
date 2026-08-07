"use client";

import type { AuthorCardsState } from "@/hooks/use-profile";
import { toProfileTopics, toRecentPublishedLabel } from "@/lib/adapters/profile";
import type { Profile } from "@/types/profile";

/** 목업 「주로 다루는 주제」 chip 개수. 더 늘리면 300px 패널에서 두 줄을 넘긴다. */
const TOPIC_LIMIT = 4;

/**
 * 프로필 우측 rail — 목업 `profile-user.html` 의 `.side-r` 자리.
 *
 * **화면이 이미 가진 데이터만 쓴다.** 프로필 응답과 카드 목록을 상위(ProfileScreen)에서 받아 계산할
 * 뿐이라 rail 때문에 API 를 다시 부르지 않는다.
 *
 * 목업 3개 패널 중 **둘만** 만든다:
 * - 「공개 활동」 — 전체 공개(`publicCardCount`) · 최근 공개(서버 최신순 첫 카드의 날짜)
 * - 「주로 다루는 주제」 — 조회된 공개 카드의 `tags` 집계
 *
 * 만들지 않은 것과 이유:
 * - **「이번 주 공개 N건」**: 기간 집계 API 가 없고 카드 목록은 최대 50건 표본이라(서버 limit 상한)
 *   "이번 주"를 정확히 셀 수 없다. 표본으로 센 값을 기간 통계처럼 보이게 하지 않는다. 그래서 패널
 *   제목도 목업의 `이번 주 활동` 이 아니라 「공개 활동」이다 — 주지 못하는 기간을 제목이 약속하지
 *   않게 한다.
 * - **「비슷한 관심사의 사용자」**: 사용자 추천·목록·타인 관심사 API 가 모두 없다. 목업의 시안
 *   사용자를 그대로 넣지 않는다.
 *
 * 디자인은 홈 rail 과 같은 handoff 토큰을 따른다: `.rpanel`(bg-card·border·radius 14·px-4 py-[15px]) ·
 * `.rpanel h4`(13px/700) · `.rstat`(label↔값, 12.5px, border-t, 첫 행 border 없음).
 * 300px 폭 · sticky · 1240px 미만 숨김도 홈과 같다(좁은 화면에서는 본문이 폭을 갖는 편이 낫고,
 * 여기 있는 값은 전부 본문에서 다시 확인할 수 있는 요약이다).
 */
export function ProfileRail({
  profile,
  cards,
}: {
  profile: Profile;
  cards: AuthorCardsState;
}) {
  const loaded = cards.status === "success" ? cards.data : [];
  const recentLabel = toRecentPublishedLabel(loaded);
  const topics = toProfileTopics(loaded, TOPIC_LIMIT);

  return (
    <aside
      aria-label="공개 활동 요약"
      className="sticky top-4 flex w-[300px] shrink-0 flex-col gap-3.5 max-[1240px]:hidden"
    >
      <Panel title="공개 활동">
        {/* 전체 공개는 서버 count(*) 라 목록 limit 과 무관하게 항상 정확하다. */}
        <Stat label="전체 공개" value={`${profile.publicCardCount}건`} first />
        {recentLabel !== null && <Stat label="최근 공개" value={recentLabel} />}
      </Panel>

      {topics.length > 0 && (
        <Panel title="주로 다루는 주제">
          <div className="flex flex-wrap gap-2 pt-px">
            {topics.map((topic) => (
              <span
                key={topic}
                // 관심사 이름이 문장만큼 길 수 있다(실데이터 확인) — 300px 안에서 접히게 두고,
                // 공백 없는 긴 토큰도 패널 밖으로 나가지 않게 break-words 를 함께 준다.
                className="max-w-full rounded-full border border-wash-strong bg-wash px-2.5 py-1 text-[12px] font-semibold break-words text-signal-ink"
              >
                {topic}
              </span>
            ))}
          </div>
          {/*
            표본을 숨기지 않는다 — 이 chip 들은 "관심사"가 아니라 조회된 공개 브리핑에서 센 주제다.
            태그 필터 라우트가 없으므로 button·link 로 만들지 않는다(눌리지 않는 텍스트다).
          */}
          <p className="mt-2.5 text-[11.5px] leading-[1.6] text-muted-foreground">
            최근 공개 브리핑 {loaded.length}건에서 자주 나온 주제예요.
          </p>
        </Panel>
      )}
    </aside>
  );
}

/** .rpanel — rail 패널 껍데기. 제목은 heading 으로 둬 rail 이 문서 구조에 잡히게 한다. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border bg-card px-4 py-[15px]">
      <h2 className="mb-[15px] text-[13px] font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** .rstat — label ↔ 값 한 줄. 첫 행은 위 구분선을 없앤다(handoff `:first-of-type` 규칙). */
function Stat({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-t border-border py-2 text-[12.5px] text-ink-mid ${
        first ? "border-t-0 pt-px" : ""
      }`}
    >
      <span className="shrink-0">{label}</span>
      <b className="min-w-0 truncate font-bold text-foreground">{value}</b>
    </div>
  );
}
