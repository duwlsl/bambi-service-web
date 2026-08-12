import { isUuid } from "@/lib/utils";

/**
 * 보고서 상세(`/report/{id}`) 의 **진입 출처** — 상단 뒤로가기의 문구와 목적지를 함께 정한다.
 *
 * 왜 필요한가: 상세 화면 하나를 여섯 진입점이 공유한다. 예전에는 뒤로가기가 `홈 피드로` 문구에
 * `href="/"` 하나로 고정돼 있었는데, 홈 `/` 의 기본 탭은 **[내 보고서]** 라(2026-07-27 정보구조)
 * 공개 피드에서 들어온 사용자는 문구와 다른 탭에 떨어졌고, 나머지 진입점은 전부 온 곳과 무관한
 * 화면으로 튕겨 나갔다. 문구·목적지를 둘 다 진입 출처 하나에서 파생시켜(`reportBackTarget`)
 * 어긋날 수 없게 한다.
 *
 * 왜 쿼리 파라미터인가: 소유자 여부로는 출처를 알 수 없고(홈 피드에서 자기 공개 보고서를 열 수
 * 있다), `document.referrer` · 히스토리 추측은 새로고침·직접 진입에서 무너진다. 링크를 만드는
 * 쪽이 아는 사실을 URL 에 실어 보내면 새로고침·뒤로가기·북마크에서도 그대로 남는다.
 *
 * ## 안전
 *
 * 목적지는 **이 모듈이 만든 고정 내부 경로뿐**이다. 쿼리에서 받은 문자열이 href 가 되는 경로가
 * 없다 — 토큰은 아래 allowlist 로만 좁히고, 동적 목적지(프로필)조차 자유 경로가 아니라
 * **UUID 하나**만 받아 `/users/{uuid}` 를 이 모듈이 조립한다. 따라서 외부 URL ·
 * protocol-relative(`//evil`) · `javascript:` · 임의 경로는 어떤 조합으로도 목적지가 될 수 없고,
 * 전부 기본값(홈 피드)으로 접힌다.
 * (알림 `targetPath` 를 허용 형식으로만 좁히는 `lib/notifications/resolve-notification-target.ts`
 * 와 같은 규율이다.)
 *
 * ## 문구
 *
 * 뒤로가기 문구는 **목적지 화면이 실제로 쓰는 이름**과 맞춘다 — 홈 탭 `내 보고서`(탭 라벨) 와
 * `/reports` 의 `내 보고서 전체 보기`(h1) 는 서로 다른 화면이라 문구도 다르다.
 */

/** 상세 링크가 진입 출처를 싣는 쿼리 키 — `/report/{id}?from=scraps`. */
export const REPORT_ORIGIN_PARAM = "from";

/**
 * 동적 목적지의 대상 식별자 키 — 지금은 프로필(`?from=profile&fromId={UUID}`) 하나뿐이다.
 * **경로가 아니라 식별자만** 받는다(경로를 받으면 그게 곧 open-redirect 다).
 */
export const REPORT_ORIGIN_ID_PARAM = "fromId";

/**
 * 홈 탭 URL 계약 — **이 모듈이 단일 소스**이고 홈 화면(`components/home/home-screen.tsx`)도
 * 여기서 가져다 쓴다. 뒤로가기 목적지와 홈이 실제로 여는 탭이 갈라지지 않게 하려는 것이다.
 *
 * `/?tab=feed` = [피드] 탭 · **쿼리 없음 `/` = 기본 탭 [내 보고서]**
 * (2026-08-11 규약 — 기본 탭은 홈 주소를 지저분하게 만들지 않으려고 쿼리를 붙이지 않는다.)
 */
export const HOME_TAB_PARAM = "tab";
export const HOME_FEED_TAB_VALUE = "feed";

/** 허용 출처 토큰 — 실제 운영 진입점 6곳(프로필은 내 프로필/남의 프로필 2갈래). */
export type ReportOriginToken =
  | "feed" // 홈 [피드] 탭 (공개 피드 게시물)
  | "mine" // 홈 [내 보고서] 탭
  | "reports" // /reports 내 보고서 전체 보기
  | "scraps" // /scraps 북마크
  | "notifications" // /notifications 알림
  | "profile-self" // /profile 내 프로필 (정적 진입점)
  | "profile"; // /users/{publicId} 공개 프로필 (동적 — UUID 필요)

/** 정적 목적지 토큰 = `profile` 을 뺀 나머지. 이들은 추가 식별자가 필요 없다. */
export type StaticOriginToken = Exclude<ReportOriginToken, "profile">;

/**
 * 해석된 진입 출처. `profile` 만 대상 프로필의 publicId 를 함께 갖는다
 * (카드 자신의 publicId 와 헷갈리지 않도록 필드명을 `profilePublicId` 로 분리했다).
 */
export type ReportOrigin =
  | { token: StaticOriginToken }
  | { token: "profile"; profilePublicId: string };

/** 정적 목적지 표 — 문구는 목적지 화면이 실제로 쓰는 이름과 맞춘다. */
const STATIC_TARGETS: Record<StaticOriginToken, { label: string; href: string }> = {
  // 홈 [피드] 탭. 기본 탭이 [내 보고서]라 피드에 닿으려면 탭을 명시해야 한다.
  feed: { label: "홈 피드로", href: `/?${HOME_TAB_PARAM}=${HOME_FEED_TAB_VALUE}` },
  // 홈 [내 보고서] 탭 = 쿼리 없는 `/`(기본 탭).
  mine: { label: "내 보고서로", href: "/" },
  // `/reports` 의 h1 이 「내 보고서 전체 보기」다 — 홈 탭의 「내 보고서」와 다른 화면이라 문구도 나눈다.
  reports: { label: "내 보고서 전체 보기로", href: "/reports" },
  // `/scraps` 의 h1·내비 라벨이 모두 「북마크」다(구 「보관함」 아님).
  scraps: { label: "북마크로", href: "/scraps" },
  notifications: { label: "알림으로", href: "/notifications" },
  // 내비 [프로필]의 정적 진입점. `/users/{내 id}` 가 아니라 `/profile` 로 되돌린다.
  "profile-self": { label: "내 프로필로", href: "/profile" },
};

/**
 * 출처를 알 수 없을 때의 기본 목적지 — 홈 피드.
 * 상세 URL 직접 진입 · 공유 링크(공유는 `from` 을 싣지 않는다) · 잘못된 값이 전부 여기로 온다.
 * 홈 피드는 게스트도 볼 수 있는 공개 목적지라 로그인 상태와 무관하게 안전하다
 * (게스트에게는 [내 보고서]·북마크·알림·프로필이 없다).
 */
export const DEFAULT_REPORT_ORIGIN: ReportOrigin = { token: "feed" };

/** 정적 토큰인지 확인한다. 배열(`?from=a&from=b`) · null · undefined 는 전부 false. */
export function isStaticOriginToken(value: unknown): value is StaticOriginToken {
  return typeof value === "string" && Object.hasOwn(STATIC_TARGETS, value);
}

/**
 * 쿼리 원문 → 출처. 허용 토큰이 아니거나 프로필인데 대상 UUID 가 없으면 기본값으로 접는다.
 * 던지지 않는다 — 잘못된 값은 오류가 아니라 "출처를 모름"으로 다룬다.
 */
export function parseReportOrigin(
  rawToken: string | string[] | undefined | null,
  rawId?: string | string[] | undefined | null,
): ReportOrigin {
  if (isStaticOriginToken(rawToken)) return { token: rawToken };
  if (rawToken === "profile") {
    // 프로필만 식별자를 받는다. **UUID 형식일 때만** 통과 — 경로·상대경로·외부 URL 은
    // 전부 여기서 걸러지고, 아래에서 `/users/{uuid}` 조립도 이 모듈이 한다.
    if (typeof rawId === "string" && isUuid(rawId)) {
      return { token: "profile", profilePublicId: rawId };
    }
  }
  return DEFAULT_REPORT_ORIGIN;
}

/** 홈 경로 + 열 탭. 홈 화면과 같은 계약을 쓰므로 문구와 실제로 열리는 탭이 갈라지지 않는다. */
export function homeTabHref(tab: "feed" | "mine"): string {
  return STATIC_TARGETS[tab].href;
}

/** 상세 링크 — 진입 출처를 실어 보낸다. 목록 카드는 전부 이 함수로 href 를 만든다. */
export function reportDetailHref(publicId: string, origin: ReportOrigin): string {
  const base = `/report/${encodeURIComponent(publicId)}?${REPORT_ORIGIN_PARAM}=${origin.token}`;
  if (origin.token !== "profile") return base;
  return `${base}&${REPORT_ORIGIN_ID_PARAM}=${encodeURIComponent(origin.profilePublicId)}`;
}

/** 상세 상단 뒤로가기 — 문구와 목적지가 **항상 같은 출처에서 함께** 나온다(어긋날 수 없다). */
export function reportBackTarget(origin: ReportOrigin): { label: string; href: string } {
  if (origin.token !== "profile") return STATIC_TARGETS[origin.token];
  // 자유 경로가 아니라 검증된 UUID 로 이 모듈이 조립한다 — `/users/` 밖으로 나갈 수 없다.
  return { label: "프로필로", href: `/users/${encodeURIComponent(origin.profilePublicId)}` };
}
