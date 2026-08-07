/**
 * 프로필 도메인 타입 (07-31 실측 기반).
 * 백엔드: GET /api/users/{publicId}/profile · GET /api/users/{publicId}/cards ·
 *         PUT /api/users/me · POST/DELETE /api/users/{publicId}/follow
 * 공개 프로필·작성자 카드는 비로그인 열람 허용(백엔드 permitAll) — 게스트도 볼 수 있다.
 */

import type {
  CardAuthor,
  CardSource,
  CardSourceVM,
  PublicFeedAuthorVM,
  PublicFeedSocialVM,
} from "@/types/feed";

/** GET /api/users/{publicId}/profile 의 data. */
export type Profile = {
  publicId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  joinedAt: string; // ISO — 화면에는 "가입 YYYY년 M월"로 표기
  followerCount: number;
  followingCount: number;
  following: boolean; // 보고 있는 내가 이 사용자를 팔로우 중인지 (게스트는 항상 false)
  publicCardCount: number; // 전체 PUBLIC 카드 수 — 서버 count(*) 라 목록 limit 과 무관하다
};

/**
 * 작성자 공개 카드 1건(API DTO) — GET /api/users/{publicId}/cards 항목.
 * 서버는 공개 피드와 **같은 `PublicCardResponse`** 를 쓴다(service-api AuthorCardController ·
 * FeedService.publicCardsByAuthor 실측, 2026-08-07). 그래서 필드 규약도 공개 피드와 같다:
 *
 * - `likeCount`·`liked` 는 서버 primitive(long·boolean) — 유효한 응답에서는 null 이 아니다.
 * - `whyForYou` 는 내려오지만 **옮기지 않는다** — 카드 소유자 관점의 문장이라 남의 프로필을 보는
 *   조회자에게는 사실이 아니고, 서버도 폐기(관심사 태그로 대체) 예정으로 표시해 두었다.
 * - `tags`·`scrapped` 를 optional 로 두는 건 **이 필드가 없는 배포본에서 화면이 깨지지 않게**
 *   하려는 것뿐이다(types/feed.ts `PublicFeedCardResponse` 와 같은 근거). 값 판별은 어댑터가 한다.
 *   서버에 없는 필드를 미리 선언하지 않는다 — 여기 있는 것은 전부 실제 응답에 있는 값이다.
 */
export type AuthorCardResponse = {
  publicId: string;
  title: string;
  summary: string;
  tags?: string[] | null;
  /** 객체는 항상 존재. 단 publicId·username·displayName 이 동시에 null 일 수 있다(탈퇴 작성자). */
  author: CardAuthor;
  likeCount: number;
  liked: boolean;
  scrapped?: boolean | null;
  sources: CardSource[];
  createdAt: string; // ISO-8601 (서버 OffsetDateTime)
};

/**
 * 프로필 공개 브리핑 카드(화면 모델) — 어댑터(lib/adapters/profile.ts)가 검증해 좁힌 값만 담는다.
 *
 * `social`·`scrapped` 가 null 이면 "값을 모른다"는 뜻이고, 화면은 그 액션만 렌더하지 않는다.
 * `0`·`false` 로 덮지 않는다 — 이미 담아둔 카드의 보관 버튼을 뒤집거나 "좋아요 0개"를 단정하게 된다.
 */
export type AuthorCardVM = {
  publicId: string;
  title: string;
  summary: string;
  author: PublicFeedAuthorVM;
  /** 좋아요 두 값. 검증 실패 시 null → 좋아요 버튼을 렌더하지 않는다. */
  social: PublicFeedSocialVM | null;
  /** 조회자 기준 보관 여부. null 이면 보관 버튼을 렌더하지 않는다. */
  scrapped: boolean | null;
  sources: CardSourceVM[];
  /** 관심사 태그 — 카드에는 표시하지 않고 우측 rail 의 「주로 다루는 주제」 집계에만 쓴다. */
  tags: string[];
  /** 카드 메타용 전체 시각("2026년 8월 7일 오전 07:10"). 파싱 실패 시 "". */
  createdAtLabel: string;
  /** rail 요약용 날짜만("2026년 8월 7일"). 파싱 실패 시 "". */
  createdAtDateLabel: string;
};

/** PUT /api/users/me 요청 body — 프로필 편집 모달 3필드. */
export type UpdateProfileRequest = {
  displayName: string;
  username: string | null; // 미변경이면 현재값 그대로 전송(빈값=변경 없음 처리)
  bio: string | null;
};

/** POST/DELETE /api/users/{publicId}/follow 의 data. */
export type FollowData = {
  following: boolean;
  followerCount: number;
};

/** 팔로워/팔로잉 모달의 두 탭. 값이 그대로 경로 세그먼트로 쓰인다. */
export type FollowListKind = "followers" | "following";

/**
 * GET /api/users/{publicId}/followers · /following 항목 (API DTO —
 * service-api `FollowUserResponse` · `FollowService.toUserList` 실측, 2026-08-07).
 *
 * **응답 필드는 이 넷이 전부다.** bio·아바타 이미지·관심 주제는 내려오지 않는다 →
 * 목업 행의 `@handle · 주제` 에서 주제 부분은 만들 수 없다(가짜로 채우지 않는다).
 *
 * - 정렬은 서버가 username 오름차순(대소문자 무시)으로 확정해 준다 → 프론트에서 다시 정렬하지 않는다.
 * - 탈퇴(soft delete) 사용자는 서버가 제외한다(`findByIdInAndDeletedAtIsNull`).
 * - `following` = **조회자 기준** 내가 이 사용자를 팔로우 중인지. 게스트는 전부 false.
 * - **페이지네이션이 없다.** 컨트롤러에 page/size 파라미터 자체가 없고 전체 목록을 한 번에 준다
 *   (2026-08-07 배포 실측: `?page=0&size=5` 를 붙여도 무시된다).
 */
export type FollowUserResponse = {
  publicId: string;
  username: string | null;
  displayName: string | null;
  following: boolean;
};

/**
 * 모달 행(화면 모델) — 어댑터가 검증해 좁힌 값만 담는다.
 * `following` 이 null 이면 "값을 모른다" → 그 행의 팔로우 버튼을 렌더하지 않는다
 * (false 로 덮으면 이미 팔로우 중인 사람에게 `팔로우` 를 띄우고 클릭 한 번에 뒤집게 된다).
 */
export type FollowUserVM = {
  publicId: string;
  username: string | null;
  displayName: string | null;
  /** 아바타 이니셜 — displayName → username 순의 실제 이름에서만 뽑는다(둘 다 없으면 null). */
  initial: string | null;
  following: boolean | null;
};
