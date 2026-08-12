import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);

/** report-cover-image.test.mjs 와 같은 패턴 — alias import 는 shim 으로 넘긴다. */
function compile(relativePath, requireModule = () => {
  throw new Error("unexpected require");
}) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourceUrl.pathname,
  });
  const commonJsModule = { exports: {} };
  vm.runInNewContext(
    compiled.outputText,
    { module: commonJsModule, exports: commonJsModule.exports, require: requireModule, URL, Object },
    { filename: sourceUrl.pathname },
  );
  return commonJsModule.exports;
}

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

// utils.ts 는 clsx/tailwind-merge(실 패키지)를 쓰므로 alias 가 아닌 id 는 실제 require 로 넘긴다.
const utils = compile("../lib/utils.ts", (id) => nodeRequire(id));
const reportOrigin = compile("../lib/report-origin.ts", (id) => {
  if (id === "@/lib/utils") return utils;
  throw new Error(`unexpected require: ${id}`);
});

const {
  DEFAULT_REPORT_ORIGIN,
  HOME_FEED_TAB_VALUE,
  HOME_TAB_PARAM,
  REPORT_ORIGIN_ID_PARAM,
  REPORT_ORIGIN_PARAM,
  homeTabHref,
  isStaticOriginToken,
  parseReportOrigin,
  reportBackTarget,
  reportDetailHref,
} = reportOrigin;

const CARD_ID = "3f4a1c8e-1111-4222-8333-444455556666";
const PROFILE_ID = "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

/**
 * 실제 운영 진입점 6곳(프로필은 라우트가 둘이라 7 갈래).
 * `sourceCall` = 그 진입점의 링크가 실제로 출처를 싣고 있는지 보는 회귀 가드.
 */
const ENTRY_POINTS = [
  {
    name: "홈 피드 게시물",
    origin: { token: "feed" },
    label: "홈 피드로",
    href: "/?tab=feed",
    source: "../components/home/public-feed-card.tsx",
    sourceCall: /reportDetailHref\(card\.publicId, \{ token: "feed" \}\)/,
  },
  {
    name: "홈 [내 보고서] 탭",
    origin: { token: "mine" },
    label: "내 보고서로",
    href: "/",
    source: "../components/home/feed-card.tsx",
    sourceCall: /reportDetailHref\(card\.publicId, \{ token: "mine" \}\)/,
  },
  {
    name: "/reports 내 보고서 전체 보기",
    origin: { token: "reports" },
    label: "내 보고서 전체 보기로",
    href: "/reports",
    source: "../components/reports/report-archive-card.tsx",
    sourceCall: /reportDetailHref\(item\.publicId, \{ token: "reports" \}\)/,
  },
  {
    name: "/scraps 북마크",
    origin: { token: "scraps" },
    label: "북마크로",
    href: "/scraps",
    source: "../components/scrap/scrap-screen.tsx",
    sourceCall: /reportDetailHref\(card\.publicId, \{ token: "scraps" \}\)/,
  },
  {
    name: "/notifications 알림",
    origin: { token: "notifications" },
    label: "알림으로",
    href: "/notifications",
    source: "../hooks/use-notification-navigation.ts",
    sourceCall: /reportDetailHref\(result\.cardPublicId, \{ token: "notifications" \}\)/,
  },
  {
    name: "/profile 내 프로필",
    origin: { token: "profile-self" },
    label: "내 프로필로",
    href: "/profile",
    source: "../components/profile/my-profile-gate.tsx",
    sourceCall: /<ProfileScreen publicId=\{publicId\} selfRoute \/>/,
  },
  {
    name: "/users/{publicId} 공개 프로필",
    origin: { token: "profile", profilePublicId: PROFILE_ID },
    label: "프로필로",
    href: `/users/${PROFILE_ID}`,
    source: "../components/profile/author-card.tsx",
    sourceCall: /reportDetailHref\(card\.publicId, origin\)/,
  },
];

/** 상세 URL 의 쿼리를 서버가 하는 것과 같은 방식으로 되읽는다(새로고침·직접 진입과 동일 경로). */
function parseFromHref(href) {
  const url = new URL(href, "https://app.example.com");
  return parseReportOrigin(
    url.searchParams.get(REPORT_ORIGIN_PARAM),
    url.searchParams.get(REPORT_ORIGIN_ID_PARAM),
  );
}

/* ── 진입점별: 링크에 올바른 출처 · 문구와 목적지 일치 · 새로고침 유지 ─────── */

for (const entry of ENTRY_POINTS) {
  test(`${entry.name}: 상세 링크에 출처가 실린다`, () => {
    const href = reportDetailHref(CARD_ID, entry.origin);
    assert.ok(
      href.startsWith(`/report/${CARD_ID}?${REPORT_ORIGIN_PARAM}=${entry.origin.token}`),
      `실제: ${href}`,
    );
    if (entry.origin.token === "profile") {
      assert.match(href, new RegExp(`&${REPORT_ORIGIN_ID_PARAM}=${PROFILE_ID}$`));
    } else {
      // 정적 목적지는 식별자를 싣지 않는다(필요 없는 값을 URL 에 남기지 않는다).
      assert.doesNotMatch(href, new RegExp(REPORT_ORIGIN_ID_PARAM));
    }
  });

  test(`${entry.name}: 뒤로가기 문구와 목적지가 함께 일치한다`, () => {
    const back = reportBackTarget(entry.origin);
    assert.equal(back.label, entry.label);
    assert.equal(back.href, entry.href);
  });

  test(`${entry.name}: 새로고침해도 출처가 유지된다`, () => {
    // 새로고침 = 같은 URL 을 서버가 다시 파싱하는 것. 링크 → 파싱 → 목적지 왕복이 같아야 한다.
    const back = reportBackTarget(parseFromHref(reportDetailHref(CARD_ID, entry.origin)));
    assert.equal(back.label, entry.label);
    assert.equal(back.href, entry.href);
  });

  test(`${entry.name}: 진입점이 실제로 출처를 실어 보낸다(회귀 가드)`, () => {
    assert.match(read(entry.source), entry.sourceCall);
  });
}

test("모든 진입점의 문구·목적지가 서로 겹치지 않는다", () => {
  const labels = ENTRY_POINTS.map((e) => e.label);
  const hrefs = ENTRY_POINTS.map((e) => e.href);
  assert.equal(new Set(labels).size, labels.length, `문구 중복: ${labels}`);
  assert.equal(new Set(hrefs).size, hrefs.length, `목적지 중복: ${hrefs}`);
});

test("홈 [내 보고서] 탭과 /reports 는 화면 이름이 다르므로 문구도 다르다", () => {
  // /reports 의 h1 은 「내 보고서 전체 보기」, 홈 탭은 「내 보고서」 — 서로 다른 화면이다.
  assert.match(read("../components/reports/report-archive-screen.tsx"), /내 보고서 전체 보기/);
  assert.match(read("../components/home/home-screen.tsx"), /내 보고서/);
  assert.notEqual(reportBackTarget({ token: "mine" }).label, reportBackTarget({ token: "reports" }).label);
  assert.notEqual(reportBackTarget({ token: "mine" }).href, reportBackTarget({ token: "reports" }).href);
});

test("북마크 문구는 화면 h1(북마크)과 같다 — 구 명칭 「보관함」이 아니다", () => {
  assert.match(read("../components/scrap/scrap-screen.tsx"), /<h1[^>]*>북마크<\/h1>/);
  assert.equal(reportBackTarget({ token: "scraps" }).label, "북마크로");
});

/* ── 출처 없음 · 잘못된 값 ─────────────────────────────────────────────── */

test("출처 없는 직접 URL 접근은 홈 피드가 기본값이다", () => {
  const back = reportBackTarget(parseFromHref(`/report/${CARD_ID}`));
  assert.equal(back.label, "홈 피드로");
  assert.equal(back.href, "/?tab=feed");
  assert.equal(DEFAULT_REPORT_ORIGIN.token, "feed");
});

test("잘못된 출처 값은 오류 없이 안전한 기본 목적지로 접힌다", () => {
  const rejected = [
    undefined,
    null,
    "",
    "mine ", // 공백 포함 오타
    "MINE", // 대소문자 불일치
    "rec", // 홈 내부 식별자 — URL 계약 아님
    "settings",
    "__proto__", // prototype 키가 토큰으로 새지 않는지
    "constructor",
    "toString",
    ["feed", "mine"], // `?from=feed&from=mine`
    "https://evil.example.com",
    "//evil.example.com",
    "javascript:alert(1)",
    "/settings",
    "../../etc/passwd",
  ];

  for (const raw of rejected) {
    const origin = parseReportOrigin(raw);
    assert.equal(origin.token, "feed", `거부 대상: ${JSON.stringify(raw)}`);
    const { href } = reportBackTarget(origin);
    assert.ok(href.startsWith("/") && !href.startsWith("//"), `내부 경로여야 함: ${href}`);
  }
});

test("프로필 출처는 UUID 인 fromId 가 있을 때만 성립한다", () => {
  const badIds = [
    undefined,
    null,
    "",
    "not-a-uuid",
    "../../etc/passwd",
    "https://evil.example.com",
    "//evil.example.com",
    `${PROFILE_ID}/../../admin`,
    [PROFILE_ID],
  ];

  for (const badId of badIds) {
    const origin = parseReportOrigin("profile", badId);
    // 대상을 모르면 프로필로 되돌릴 수 없다 → 기본 목적지로 접는다(`/users/undefined` 금지).
    assert.equal(origin.token, "feed", `거부 대상: ${JSON.stringify(badId)}`);
    assert.equal(reportBackTarget(origin).href, "/?tab=feed");
  }

  const ok = parseReportOrigin("profile", PROFILE_ID);
  assert.equal(ok.token, "profile");
  assert.equal(reportBackTarget(ok).href, `/users/${PROFILE_ID}`);
});

test("어떤 입력으로도 목적지가 앱 밖으로 나가지 않는다", () => {
  const hostile = ["https://evil.example.com", "//evil.example.com", "javascript:alert(1)", "\\\\evil"];
  for (const token of hostile) {
    for (const id of hostile) {
      const { href } = reportBackTarget(parseReportOrigin(token, id));
      assert.ok(href.startsWith("/"), `절대·프로토콜 URL 금지: ${href}`);
      assert.ok(!href.startsWith("//"), `protocol-relative 금지: ${href}`);
      assert.ok(!href.includes(":"), `스킴 금지: ${href}`);
    }
  }
});

test("허용 토큰만 통과한다", () => {
  for (const token of ["feed", "mine", "reports", "scraps", "notifications", "profile-self"]) {
    assert.ok(isStaticOriginToken(token), token);
  }
  // profile 은 식별자가 필요해 "정적" 토큰이 아니다.
  assert.ok(!isStaticOriginToken("profile"));
  assert.ok(!isStaticOriginToken("rec"));
  assert.ok(!isStaticOriginToken("__proto__"));
  assert.ok(!isStaticOriginToken(["feed"]));
  assert.ok(!isStaticOriginToken(undefined));
});

/* ── 홈 탭 URL 계약 ────────────────────────────────────────────────────── */

test("홈 탭 링크는 홈 화면이 읽는 계약과 같다", () => {
  assert.equal(homeTabHref("feed"), `/?${HOME_TAB_PARAM}=${HOME_FEED_TAB_VALUE}`);
  assert.equal(homeTabHref("mine"), "/");

  const home = read("../components/home/home-screen.tsx");
  assert.match(home, /value === HOME_FEED_TAB_VALUE \? "rec" : HOME_INITIAL_TAB/);
  assert.match(home, /const HOME_INITIAL_TAB: HomeTab = "mine"/);
  // 홈이 쿼리 상수를 따로 들고 있으면 계약이 갈라진다 — 반드시 공용 모듈에서 가져온다.
  assert.match(home, /from "@\/lib\/report-origin"/);
  assert.doesNotMatch(home, /const TAB_QUERY_KEY|const FEED_TAB_VALUE/);
});

/* ── 공유·복사 URL ─────────────────────────────────────────────────────── */

test("공유·복사 링크에는 진입 출처가 포함되지 않는다", () => {
  // 남에게 보내는 링크는 내 진입 경로와 무관하다 — 받는 쪽은 기본값(홈 피드)로 열린다.
  // (`from` 만으로 찾으면 `import ... from` 에 걸리므로 쿼리 형태로 확인한다.)
  const queryPattern = new RegExp(`[?&](${REPORT_ORIGIN_PARAM}|${REPORT_ORIGIN_ID_PARAM})=`);
  for (const source of [
    "../hooks/use-copy-card-link.ts",
    "../components/home/post-more-menu.tsx",
    "../components/report/card-share-modal.tsx",
  ]) {
    assert.doesNotMatch(read(source), queryPattern, source);
    assert.doesNotMatch(read(source), /reportDetailHref/, source);
  }
});

test("공유 URL 을 받은 사람은 기본 목적지(홈 피드)로 돌아간다", () => {
  // useCopyCardLink 가 만드는 형태 = `/report/{publicId}` (쿼리 없음).
  const back = reportBackTarget(parseFromHref(`/report/${CARD_ID}`));
  assert.equal(back.label, "홈 피드로");
  assert.equal(back.href, "/?tab=feed");
});

/* ── 상세 화면 배선 ────────────────────────────────────────────────────── */

test("서버가 ?from=·?fromId= 를 좁혀서 상세에 넘긴다", () => {
  const source = read("../app/report/[id]/page.tsx");
  assert.match(
    source,
    /parseReportOrigin\(query\[REPORT_ORIGIN_PARAM\], query\[REPORT_ORIGIN_ID_PARAM\]\)/,
  );
  assert.match(source, /<CardDetailScreen publicId=\{id\} origin=\{origin\} \/>/);
});

test("상세 뒤로가기는 하드코딩 `/` 가 아니라 출처에서 나온다", () => {
  const source = read("../components/report/card-detail-screen.tsx");
  assert.match(source, /const back = reportBackTarget\(origin\)/);
  assert.match(source, /href=\{back\.href\}/);
  assert.match(source, /\{back\.label\}/);
  assert.doesNotMatch(source, /"홈 피드로", href: "\/"/);
});

/* ── 렌더 결과 — 상세 화면이 실제로 내보내는 뒤로가기 링크 ─────────────────────
 *
 * 위 가드가 소스 문자열을 보는 것과 달리, 여기서는 상세 화면을 실제로 렌더해
 * **문구와 목적지가 한 <a> 안에 함께** 나오는지 확인한다(브라우저 검수의 코드 측 대역).
 * ------------------------------------------------------------------------------- */

const React = nodeRequire("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server");

function compileComponent(relativePath, requireModule) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: sourceUrl.pathname,
  });
  const commonJsModule = { exports: {} };
  vm.runInNewContext(
    compiled.outputText,
    { module: commonJsModule, exports: commonJsModule.exports, require: requireModule, URL, Intl },
    { filename: sourceUrl.pathname },
  );
  return commonJsModule.exports;
}

const linkStub = {
  __esModule: true,
  default: ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children),
};
const emptyComponent = () => null;

/** 카드 상세가 화면 모델에서 읽는 필드만 채운 최소 VM — 이 테스트는 readbar 만 본다. */
const CARD_VM = {
  publicId: CARD_ID,
  title: "반도체 공급망 브리핑",
  summary: "요약",
  whyForYou: "",
  createdAtLabel: "",
  reportType: null,
  sources: [],
};

/**
 * readbar 외의 부속은 **무엇이든** 빈 컴포넌트로 받는다.
 * card-detail-screen 은 자주 손대는 화면이라 import 가 늘 때마다 이 테스트가
 * `unexpected require` 로 깨지면 안 된다 — 가드가 지켜야 할 건 뒤로가기 링크지 import 목록이 아니다.
 * 반환값을 실제로 읽는 모듈만 아래에 명시한다.
 */
function detailRequire({ owner }) {
  const modules = {
    react: React,
    "react/jsx-runtime": nodeRequire("react/jsx-runtime"),
    "next/link": linkStub,
    "@/lib/report-origin": reportOrigin,
    "@/components/auth/use-auth": {
      useAuth: () => ({
        status: "authenticated",
        user: { publicId: "viewer-1" },
        refreshAuth() {},
      }),
    },
    "@/hooks/use-card-detail": {
      useCardDetail: () => ({ status: "ready", card: { publicId: CARD_ID }, refetch() {} }),
    },
    "@/hooks/use-report-body": { useReportBody: () => ({ status: "none", refetch() {} }) },
    "@/hooks/use-copy-card-link": { useCopyCardLink: () => ({ copy() {}, feedback: null }) },
    "@/lib/adapters/card": {
      toFeedCardVM: () => CARD_VM,
      toCardSocial: () => null,
      toScrapped: () => null,
      isPublicCard: () => false,
      isCardOwner: () => owner,
    },
    "@/lib/adapters/report": { toReportCoverImage: () => null, toReportRailVM: () => ({}) },
    "@/lib/report-delta": { isDeltaReport: () => false },
  };
  return (id) => modules[id] ?? new Proxy({}, { get: () => emptyComponent });
}

function renderDetail(origin, { owner = false } = {}) {
  const { CardDetailScreen } = compileComponent(
    "../components/report/card-detail-screen.tsx",
    detailRequire({ owner }),
  );
  return renderToStaticMarkup(React.createElement(CardDetailScreen, { publicId: CARD_ID, origin }));
}

/** readbar 의 뒤로가기 <a> 만 뽑는다 — 문구와 href 를 한 태그 안에서 같이 본다. */
function backAnchor(html) {
  const anchor = html.match(/<a[^>]*href="[^"]*"[^>]*>.*?<\/a>/s);
  assert.ok(anchor, "뒤로가기 링크가 렌더되어야 한다");
  return anchor[0];
}

for (const entry of ENTRY_POINTS) {
  test(`렌더: ${entry.name} → \`${entry.label}\` 링크가 ${entry.href} 를 가리킨다`, () => {
    const anchor = backAnchor(renderDetail(entry.origin));
    assert.match(anchor, new RegExp(`href="${entry.href.replace(/[?]/g, "\\?")}"`));
    assert.match(anchor, new RegExp(entry.label));
  });

  test(`렌더: ${entry.name} — 소유자여도 뒤로가기 목적지가 같다`, () => {
    // 소유자 판정(isCardOwner)을 true 로 뒤집어도 문구·목적지가 바뀌지 않아야 한다.
    const asOwner = backAnchor(renderDetail(entry.origin, { owner: true }));
    const asViewer = backAnchor(renderDetail(entry.origin, { owner: false }));
    assert.match(asOwner, new RegExp(`href="${entry.href.replace(/[?]/g, "\\?")}"`));
    assert.match(asOwner, new RegExp(entry.label));
    // 링크 자체가 동일해야 한다(소유자 전용 UI 는 readbar 의 다른 자리에 있다).
    assert.equal(asOwner, asViewer);
  });
}

test("렌더: 출처 없는 직접 진입은 홈 피드로 렌더된다", () => {
  const anchor = backAnchor(renderDetail(parseFromHref(`/report/${CARD_ID}`)));
  assert.match(anchor, /href="\/\?tab=feed"/);
  assert.match(anchor, /홈 피드로/);
});

test("렌더: 잘못된 출처 값은 오류 없이 기본 목적지로 렌더된다", () => {
  const anchor = backAnchor(
    renderDetail(parseFromHref(`/report/${CARD_ID}?from=javascript%3Aalert(1)&fromId=..%2F..%2Fadmin`)),
  );
  assert.match(anchor, /href="\/\?tab=feed"/);
  assert.match(anchor, /홈 피드로/);
});

test("렌더: 링크의 접근 가능한 이름 = 화면 문구 (화살표는 장식이라 제외된다)", () => {
  const anchor = backAnchor(renderDetail({ token: "scraps" }));
  assert.match(anchor, /aria-hidden="true"[^>]*>\s*←\s*<\/span>/);
  const accessibleName = anchor
    .replace(/<span[^>]*aria-hidden="true"[^>]*>.*?<\/span>/gs, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  assert.equal(accessibleName, "북마크로");
  // aria-label 로 문구를 덮어쓰지 않는다(덮어쓰면 화면 문구와 갈라질 수 있다).
  assert.doesNotMatch(anchor, /aria-label=/);
});
