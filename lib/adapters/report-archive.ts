import { toCardTags } from "@/lib/adapters/card";
import { getReportTypeLabel, toReportType } from "@/lib/report-type";
import type { CardResponse } from "@/types/feed";
import type {
  ArchiveCard,
  ArchiveGroup,
  ArchiveItem,
  ArchiveMonthlyCount,
  ArchivePeriod,
  ArchiveSort,
  ArchiveTagFilter,
} from "@/types/report-archive";

/**
 * 내 보고서 전체 보기(/reports) 어댑터 — 전부 순수 함수.
 *
 * - 실데이터 원천은 기존 GET /api/feed(CardResponse) 그대로(fetch 는 hooks/use-report-archive.ts).
 * - 서버 검색·필터·페이지네이션 API 가 없고 목록이 전량 반환됨을 실측 확인했으므로(FeedService:
 *   "P0 피드는 '내 카드 전부'와 동치", LIMIT 없음) 검색·필터·그룹핑·집계는 클라이언트에서 수행한다.
 * - mock 메타(태그·유형 등) 병합은 lib/adapters/report-archive-mock.ts 가 담당하고,
 *   여기 함수들은 mock 유무와 무관하게 동작한다(mock 없으면 해당 조건·표시가 자연히 비활성).
 * - member 전용 화면이 인증 확정 후 클라이언트에서만 렌더되므로(홈 member 피드와 동일)
 *   로컬 타임존 포맷의 하이드레이션 불일치 위험은 없다.
 */

const TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" });

export function toArchiveCard(card: CardResponse): ArchiveCard {
  const ts = Date.parse(card.createdAt);
  const valid = !Number.isNaN(ts);
  return {
    publicId: card.publicId,
    title: card.title,
    summary: card.summary,
    whyForYou: card.whyForYou,
    sources: card.sources ?? [],
    // 미배포 필드 — 없거나 계약 밖 값이면 null(화면은 종류 배지를 생략한다).
    reportType: toReportType(card.reportType),
    // 공개 범위·태그는 홈 [내 보고서] 카드와 **같은 응답·같은 어댑터 규율**을 쓴다(중복 정규화 금지).
    // tags 키가 없는 배포본에서는 toCardTags 가 빈 배열을 준다 — 화면이 태그를 생략한다.
    visibility: card.visibility,
    tags: toCardTags(card.tags),
    createdAtMs: valid ? ts : null,
    timeLabel: valid ? TIME_FORMAT.format(ts) : "", // 잘못된 날짜는 표시 생략(임의 값 생성 금지)
  };
}

/**
 * 검색 — 대소문자 구분 없이(한글은 그대로), 항목에 실제로 존재하는 값만 대상으로 한다:
 * title · summary · whyForYou · sources[].title · sources[].url · **tags(실측)**
 * + 실 reportType 표시명("아침 브리핑"/"온디맨드") · mock 메타가 있으면 mock tags · category.
 * 검색어가 비어 있으면(trim 후) 전체를 반환한다. API 재호출 없음(순수 필터).
 *
 * 실측 태그가 검색 대상에 들어간 이유: 카드 메타에 태그를 노출하고 검색창 placeholder 도 내 태그를
 * 예시로 제시하므로(`topArchiveTags`), 보이는 값·권하는 값이 검색되지 않으면 안 된다.
 */
export function searchArchiveItems(items: ArchiveItem[], rawQuery: string): ArchiveItem[] {
  const query = rawQuery.trim().toLowerCase();
  if (query === "") return items;
  return items.filter((item) => {
    const haystack = [
      item.title,
      item.summary,
      item.whyForYou,
      ...item.sources.flatMap((s) => [s.title, s.url]),
      ...item.tags,
      getReportTypeLabel(item.reportType) ?? "",
      ...(item.mock ? [...item.mock.tags, item.mock.category ?? ""] : []),
    ];
    return haystack.some((v) => (v ?? "").toLowerCase().includes(query));
  });
}

/**
 * 태그 필터 — 단일 선택. 실측 tags 와 mock tags 중 **어느 쪽이든 일치하면** 통과시킨다
 * (필터 chip 목록 자체는 여전히 mock 전용이라 실 API 모드에서는 항상 "all" 이다).
 */
export function filterArchiveByTag(items: ArchiveItem[], tag: ArchiveTagFilter): ArchiveItem[] {
  if (tag === "all") return items;
  return items.filter(
    (item) => item.tags.includes(tag) || (item.mock?.tags.includes(tag) ?? false),
  );
}

/**
 * 검색창 placeholder 예시용 태그 — **내 보고서에 실제로 붙어 있는** 태그 중 많이 쓰인 순으로 최대
 * `limit` 개. 예시 문구를 임의로 지어내지 않으려고 목록에서만 뽑는다(추가 API 호출 없음).
 *
 * 실측 `tags` 를 먼저 보고, 하나도 없을 때만 mock 메타 태그로 물러난다 — `tags` 미배포 배포본에서는
 * 빈 배열이 되고, 그때 호출부가 예시 없이 "보고서 검색" 만 남긴다.
 * 동점은 목록에 먼저 등장한 태그가 앞에 온다(Map 삽입 순서 — 정렬이 안정적이라 렌더가 흔들리지 않는다).
 */
export function topArchiveTags(items: ArchiveItem[], limit = 3): string[] {
  const count = (pick: (item: ArchiveItem) => string[]) => {
    const byTag = new Map<string, number>();
    for (const item of items) {
      for (const tag of pick(item)) byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
    }
    return [...byTag.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag]) => tag);
  };

  const real = count((item) => item.tags);
  return real.length > 0 ? real : count((item) => item.mock?.tags ?? []);
}

/**
 * 기간 필터 — createdAt(로컬) 기준 클라이언트 순수 필터. API 재호출 없음.
 * 날짜 파싱 실패 카드(createdAtMs=null)는 기간 판정이 불가능하므로 "전체"에서만 보인다.
 */
export function filterArchiveByPeriod<T extends { createdAtMs: number | null }>(
  items: T[],
  period: ArchivePeriod,
  now: Date,
): T[] {
  if (period === "all") return items;
  const days = period === "7d" ? 7 : 30;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return items.filter((c) => c.createdAtMs !== null && c.createdAtMs >= cutoff);
}

/** 정렬 — latest 는 서버 최신순 입력 그대로, oldest 는 createdAt 오름차순(날짜 미상은 마지막). */
export function sortArchive<T extends { createdAtMs: number | null }>(
  items: T[],
  sort: ArchiveSort,
): T[] {
  if (sort === "latest") return items;
  return [...items].sort(
    (a, b) => (a.createdAtMs ?? Number.POSITIVE_INFINITY) - (b.createdAtMs ?? Number.POSITIVE_INFINITY),
  );
}

/** 사용자 로컬 기준 연·월·일 키(그룹 동일성 판단). */
function localDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** 그룹 라벨 — 오늘/어제는 접두사 병기, 같은 해는 "M월 D일", 다른 해는 "YYYY년 M월 D일". */
function dateLabel(ts: number, now: Date): string {
  const d = new Date(ts);
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const key = localDateKey(ts);
  if (key === localDateKey(now.getTime())) return `오늘 · ${md}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === localDateKey(yesterday.getTime())) return `어제 · ${md}`;
  if (d.getFullYear() !== now.getFullYear()) return `${d.getFullYear()}년 ${md}`;
  return md;
}

/**
 * createdAt 로컬 날짜 기준 그룹핑(보고서는 항상 날짜별로 묶는다 — 묶기 옵션 없음).
 * 입력 순서를 유지하며 등장 순서대로 그룹을 만든다.
 * 파싱 실패 카드는 화면을 깨뜨리지 않도록 마지막 "날짜 정보 없음" 그룹으로 모은다.
 */
export function groupArchiveByDate<T extends { createdAtMs: number | null }>(
  items: T[],
  now: Date,
): ArchiveGroup<T>[] {
  const groups: ArchiveGroup<T>[] = [];
  const byKey = new Map<string, ArchiveGroup<T>>();
  const invalid: T[] = [];

  for (const item of items) {
    if (item.createdAtMs === null) {
      invalid.push(item);
      continue;
    }
    const key = localDateKey(item.createdAtMs);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: dateLabel(item.createdAtMs, now), cards: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.cards.push(item);
  }

  if (invalid.length > 0) {
    groups.push({ key: "unknown-date", label: "날짜 정보 없음", cards: invalid });
  }
  return groups;
}

/**
 * rail "쌓인 기록" — 실측 createdAt 만으로 월별 건수를 집계한다(가짜 수치 금지).
 * 데이터에 존재하는 월 중 최근 maxMonths 개를 최신순으로 반환. 날짜 미상은 집계에서 제외.
 */
export function monthlyArchiveCounts(
  items: { createdAtMs: number | null }[],
  now: Date,
  maxMonths = 4,
): ArchiveMonthlyCount[] {
  const byMonth = new Map<string, { ts: number; count: number }>();
  for (const item of items) {
    if (item.createdAtMs === null) continue;
    const d = new Date(item.createdAtMs);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const entry = byMonth.get(key);
    if (entry) entry.count += 1;
    else byMonth.set(key, { ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), count: 1 });
  }
  return [...byMonth.entries()]
    .sort((a, b) => b[1].ts - a[1].ts)
    .slice(0, maxMonths)
    .map(([key, { ts, count }]) => {
      const d = new Date(ts);
      const label =
        d.getFullYear() === now.getFullYear()
          ? `${d.getMonth() + 1}월`
          : `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      return { key, label, count };
    });
}
