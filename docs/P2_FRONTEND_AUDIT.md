# AlphaCatcher Frontend P2 Audit

> 앱 코드 무수정 · 읽기 전용 감사. 근거가 있는 항목만 P0/P1/P2로 분류하고 실제 수정 PR 순서를 제안한다.
> 작성일 2026-07-28. 대상 저장소 `bambi-service-web`.

---

## 1. 감사 기준

| 항목 | 값 |
|---|---|
| 기준 브랜치 | `chore/yeojin-p2-audit` |
| 최근 커밋 | `83b6376` (Merge PR #22 — 내 보고서 ERROR·Empty) 위. main 최신(PR #21 설정·#22 실패/Empty 반영됨) |
| 워킹트리 | clean (감사 중 앱 코드 변경 없음) |
| 포함된 미병합 요소 | 없음 — 설정(`app/settings`)·내 보고서 실패/Empty 모두 이미 `origin/main` 반영됨. cross-branch 참조 불필요 |
| 정적 감사 범위 | `app/**`, `components/**`, `hooks/**`, `lib/**`, `types/**`, `docs/design-handoff/**` (`.next/**`·`node_modules/**` 제외) |
| 런타임 감사 범위 | **P1 3건(R-1·R-2·R-3)은 사용자가 브라우저 재현 확인(2026-07-28).** 그 외 정적 항목은 코드 근거로 판단하고 "code-certain"/"브라우저 확인 필요"를 구분 표기했다(감사 착수 시점엔 사용자 dev 서버 보호를 위해 런타임 검증을 하지 않았고, 이후 사용자 재현 결과를 반영함) |
| 제한사항 | P1 3건 외 브레이크포인트별 렌더·200% 줌·스크린리더 노출은 코드 근거로만 판단. 잔여 확인 항목은 §12 브라우저 QA 체크리스트 |

### 이 감사의 핵심 전제 (오탐 방지)

`docs/design-handoff/components/ui-kit.html` **§15 Missing State Audit**는 *목업(HTML/CSS)* 기준으로 "모든 버튼·칩·탭·메뉴에 키보드 focus 없음", "이모지 아이콘 접근성 라벨 없음", "Empty 화면별 개별 마크업"을 Critical로 지적한다. **그러나 React 구현은 이 상당수를 이미 해결했다.** 목업 결함을 React 결함으로 옮겨 적지 않기 위해 실제 React 코드를 근거로 재판정했다.

- `.focus-ring:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` (`app/globals.css:216`) — hand-rolled 버튼·링크에 폭넓게 적용. shadcn `Button`/`Input`은 자체 `focus-visible:ring` 보유. → 목업 "focus 0건" **해결**.
- 아이콘 전용 컨트롤에 accessible name 존재 (알림 `home-nav.tsx:104`, 내 계정 `:155`, 닫기 `add-material-modal.tsx:143`, guest 아이콘 내비 `side-left.tsx:99`). → 목업 "아이콘 라벨 없음" **해결**.
- `StateView`(`components/ui/state-view.tsx`) + `PageState`로 Loading/Empty/Error 수렴. → 목업 "화면별 개별 Empty" **대부분 해결**.
- `useFocusTrap`(`hooks/use-focus-trap.ts`) — 트리거 저장·`#app-shell` inert+aria-hidden(ref-count)·초기 포커스·Tab 순환·포커스 복원. → 모달 접근성 **양호**.
- `body { word-break: keep-all; overflow-wrap: break-word }` + `html { scrollbar-gutter: stable }` (`app/globals.css:194`) — 긴 문자열·레이아웃 시프트 방지.

---

## 2. 요약

| 등급 | 건수 | 성격 |
|---|---|---|
| **P0** | **0** | 인증 게이팅 정상, 사용자에게 `error.message` 원문 미노출, 게스트 정보 노출 없음, 데이터 오도 없음(실패·Empty 작업으로 이미 처리). 핵심 홈은 사용 가능 |
| **P1** | **3** | 전부 반응형/모바일. **3건 모두 브라우저 재현 확정(2026-07-28).** 접근성에는 P1 없음(모달 포커스 트랩·핵심 키보드 조작 정상) |
| **P2** | 다수 | 접근성 폴리시(heading·landmark·일부 ARIA) + 반응형 중간 결함 + 공통 컴포넌트 중복 |
| **P3(보류)** | 2 | 실 vs mock 분기로 지금 통합 부적절 |

### 가장 먼저 해결할 3개 (전부 P1 — 브라우저 재현 확정 2026-07-28)

1. **모바일 내비게이션 전무** — 화면 폭 ≤1100px에서 유일한 메뉴(`SideLeft`)가 숨겨지고 대체 내비가 없다. 로그인 사용자가 `/wiki`·`/settings`로 갈 경로가 아예 없다. **최우선.**
   - **재현(390px·768px):** `SideLeft`가 숨겨지고 대체 모바일·태블릿 내비게이션이 없어 홈·관심사·설정 간 이동 수단이 전혀 없음을 확인.
2. **`AddMaterialModal` max-height·스크롤 없음** — 짧은 뷰포트·200% 줌에서 저장/취소 버튼 도달 불가. 소규모 CSS 수정으로 해소.
   - **재현(320px·200% 확대):** 모달 내용이 viewport 높이를 초과하고 모달 내부 스크롤이 되지 않아, 하단 저장·취소 버튼이 보이지 않고 도달 불가함을 확인.
3. **상단 nav 행 오버플로** — `flex` 행에 wrap/축소 가드가 없어 좁은 폭에서 헤더 요소가 겹치고 CTA가 가려진다.
   - **재현(390px, member 헤더):** 검색창·＋관심 자료 CTA·알림·아바타가 서로 겹치고, 검색 문구가 여러 줄로 깨지며 CTA가 가려짐을 확인. (guest 헤더도 `whitespace-nowrap` CTA가 화면 밖으로 밀림)

> **모바일 관련 맥락(정직한 판단):** 이 앱에는 반응형 레이아웃 시스템이 사실상 없다(§7). 표준 반응형 유틸은 전 코드에서 `md:text-sm`(shadcn 기본) 단 1곳뿐이며, 나머지 반응형은 열을 *삭제만* 하는 `max-[…]:hidden` 3종이다. 즉 현재는 **데스크톱 전용** 구현이고, "모바일 내비 없음"은 단일 버그라기보다 *모바일 대응이라는 미착수 작업 전체*의 대표 증상이다. 다만 그중 사용자를 실제로 막는 가장 구체적 결함이 내비게이션 삭제라 P1로 둔다. 모바일이 출시 대상 플랫폼이라면 P0에 근접한다.

---

## 3. 기존 구현 현황

라우트 10개(`app/`) ↔ 목업 19 product + 14 variants(`HTML_MOCKUP_INDEX.md`) 대조.

### 완료 (실 화면 구현 + 상태 분기 존재)
- `/` 홈 — member 2탭(내 보고서/피드) + guest 단일 탭. `home-screen.tsx`. PREPARING·ERROR(생성 실패)·READY·Empty 온보딩·loading·조회 오류 상태 모두 구현.
- `/login`, `/signup`(방식 선택), `/signup/email` — auth 폼, 검증·오류 문구·인증 게이팅.
- `/report/[id]` — 보고서 상세(`report-screen.tsx` mock / `card-detail-screen.tsx` 실 카드), 마크다운 뷰어, loading/error/권한/PREPARING/404 상태.
- `/wiki` — 관심사·LLM Wiki(`wiki-screen.tsx`, `wiki-interests.tsx`, `wiki-documents.tsx`), loading/empty/error.
- `app/error.tsx`, `app/not-found.tsx` — 전역 에러·404.

### 부분 구현
- `/settings` — 계정 이메일·테마(라이트/다크/시스템)·로그아웃만. 목업 `product/settings.html`의 브리핑 설정 등은 미포함(**의도된 축소** — 실제 지원 가능 항목만).
- `/report/[id]` — 출처·댓글/메모·반응(보관/좋아요/공유)은 mock 또는 requireAuth 게이트 수준. 상세 본문·Markdown 복사·SNS 공개는 미연동.

### 미구현 (라우트 없음) — **접근성·반응형 결함으로 기록하지 않음**
온보딩, 보관함(`saved`), 지식창고(`library`), 프로필(self/user), 알림(`notifications`), 검색(`search`), 비밀번호 재설정 4종, 토픽 화면(Pending). 각각 대응 API/정책 미확정으로 미착수. UI Kit의 여러 컴포넌트(Knowledge/Saved/Notification Card, Filter Chip, Toggle Switch, Interest Chip, Follow/Stat, functional Search, Toast)가 이 미구현 화면들에 매핑된다 → 중복이 아니라 미구현이다(§5).

---

## 4. 이슈 목록

| ID | 등급 | 영역 | 화면 | 문제 | 사용자 영향 | 근거(파일:라인) | 권장 수정 | PR |
|---|---|---|---|---|---|---|---|---|
| R-1 | **P1**(재현) | 반응형/내비 | 전 화면(member) | ≤1100px에서 `SideLeft`(유일 메뉴) 숨김 + `HomeNav`에 내비 링크 없음 + 로고가 `<div>`(Link 아님) → `/wiki`·`/settings`·홈 도달 경로 전무. `/wiki`는 back 링크도 없어 완전 고립 | 태블릿·모바일 로그인 사용자가 주요 화면 이동 불가(브라우저 back/URL 수정만) | `side-left.tsx:31,60`(`max-[1100px]:hidden`), `home-nav.tsx:28-34`(로고 div), 대체 내비 grep 0건. **브라우저 재현(390·768px, 2026-07-28): SideLeft 숨김·대체 내비 없음·홈/관심사/설정 이동 수단 전무 확인** | 반응형 내비(햄버거/드로어 또는 하단 탭) 추가; 최소한 로고를 `/` Link로 | A |
| R-2 | **P1**(재현) | 반응형/모달 | 홈·전역(관심자료) | `AddMaterialModal` 백드롭에 `overflow-y-auto` 없음 + 모달에 `max-h`/스크롤 없음. 콘텐츠 세로 ~600px+ | 짧은 화면·가로 모드·200% 줌에서 저장/취소·URL 필드 클리핑되어 도달 불가 | `add-material-modal.tsx:122-135`. **브라우저 재현(320px·200% 확대, 2026-07-28): 모달 내용이 viewport 높이 초과·내부 스크롤 안 됨·하단 저장/취소 버튼 미표시·도달 불가 확인** | 백드롭 `overflow-y-auto`+패딩, 모달 `max-h-[90vh] overflow-y-auto` | A |
| R-3 | **P1**(재현) | 반응형/내비 | 전 화면 | 상단 nav 행 `flex … gap-[18px] px-6`에 wrap/축소 가드 없음, 자식은 `whitespace-nowrap`. member 헤더는 중앙 absolute 검색창(`home-nav.tsx:82-89`)이 우측 CTA·알림·아바타와 겹침 | member(390px): 검색창·＋관심자료 CTA·알림·아바타 겹침 + 검색 문구 여러 줄로 깨지고 CTA 가려짐. guest(≤390px): 가입 CTA가 화면 밖으로·가로 스크롤 | `home-nav.tsx:26-27,82-89,48-73`. **브라우저 재현(390px member 헤더, 2026-07-28): 요소 겹침·검색 문구 줄바꿈·CTA 가려짐 확인** | 좁은 폭에서 `flex-wrap`/버튼 축소/검색창 반응형 처리/우선순위 숨김 | A |
| R-4 | P2 | 반응형 | 홈 피드 | 카드 콘텐츠 `ml-12`(48px) + 2열 이미지 그리드가 320px에서 ~196px로 압축 | 320px에서 시각적으로 매우 좁음(오버플로는 없음) | `post-card.tsx:61,66,83,99,181` | 좁은 폭에서 `ml` 축소/그리드 1열 | C |
| R-5 | P2 | 반응형 | auth | 폼 열 `px-14`(56px) — 900px 이하 브랜드 패널 숨김 후 320px에서 가용폭 208px | 좁은 화면 폼 답답함 | `auth-shell.tsx:73,84` | 좁은 폭 패딩 축소 | C |
| R-6 | P2 | 반응형 | 홈(guest) | 우측 가입 패널이 ≤1240px에서 숨김 → guest 가입 CTA가 (오버플로 위험 있는) 상단 nav에만 남음 | ≤1240px guest 가입 유도 약화 | `guest-signup-panel.tsx:13` | R-3와 함께 guest CTA 접근성 확보 | C |
| R-7 | P2 | 반응형 | 상세 | `report-screen.tsx` mock 출처명이 `flex-1`인데 `min-w-0`/`truncate` 없음(옆 chip 2개 `whitespace-nowrap`) | 실 긴 출처명 시 320px에서 압박(전역 overflow-wrap이 일부 완화) | `report-screen.tsx:224,228,234` | `min-w-0`+`truncate` | C |
| R-8 | P2 | 반응형/줌 | 전역 | 고정 px 높이 다수(`h-[280px]` 이미지, `h-[300px]` 도해, 모달 필드 `h-[46px]`)가 200% 줌에서 불성장 → R-2 모달과 겹쳐 악화 | 200% 줌 사용자, 특히 모달에서 조작 불가 | `post-card.tsx:181`, `report-body-mock.tsx:80`, 등 | 텍스트 성장 여지(min-height/auto), 모달은 R-2로 | C |
| A-1 | P2 | 접근성/heading | 홈·error·404·전체상태 | `<h1>` 없음. 홈은 첫 heading이 `<h3>`(카드), error/404/전체 상태 화면은 `StateView`가 항상 `<h2>` | 스크린리더 heading 탐색 시 최상위 제목 없음 | `home-screen.tsx`(h1 grep 0), `state-view.tsx:67`, `error.tsx`, `not-found.tsx` | 각 화면·전체상태에 `<h1>` 부여 | B |
| A-2 | P2 | 접근성/heading | auth·wiki·settings·상세 | `auth-shell.tsx` `<aside>`의 `<h2>`가 페이지 `<h1>`보다 DOM 선행(≥900px); Wiki rail `h2→h4` 스킵; 섹션 제목이 `<div>`(설정·상세·카드상세) | heading 아웃라인 비논리적 | `auth-shell.tsx:35`, `wiki-screen.tsx:118`, `settings-screen.tsx:181`, `report-screen.tsx:204,244`, `card-detail-screen.tsx:91` | 섹션을 `<h2>`로, rail heading 레벨 정정 | B |
| A-3 | P2 | 접근성/landmark | error·404·전체상태 | `<main>` 없음(`error.tsx`·`not-found.tsx`는 `<div>`; `HomeNav`/`PageState` 기반 상태 화면 다수) | "본문으로 건너뛰기" AT가 main 못 찾음(짧은 화면이라 영향 작음) | `error.tsx:28`, `not-found.tsx:12`, `home-screen.tsx:204` 등 | 정보 콘텐츠를 `<main>`으로 감싸기 | B |
| A-4 | P2 | 접근성/폼 | 로그인 | 폼 레벨 단일 오류인데 email·password 둘 다 `aria-invalid`; 오류 `<p role=alert>`가 입력과 `aria-describedby` 미연결 | SR이 유효 필드를 invalid로 인지 | `login-form.tsx:71,100,120` | 폼 레벨 오류는 필드 무효 표시 지양, describedby 연결 | B |
| A-5 | P2 | 접근성/키보드 | 홈·nav·auth | 홈 탭이 화살표키/roving tabindex 없음(Tabs 패턴 이탈); `AvatarMenu` 열림 시 메뉴로 포커스 이동 없음; 비밀번호 표시 토글 `tabIndex=-1`로 키보드 도달 불가 | 키보드 사용자 편의 저하(핵심 조작은 가능) | `home-screen.tsx:238`, `home-nav.tsx:163`, `login-form.tsx:110`, `signup-form.tsx:190` | Tabs 화살표키, 메뉴 포커스, 토글 `tabIndex` 제거 | B |
| A-6 | P2 | 접근성/모달 | 전역 모달 | body scroll lock 없음 — inert로 포커스·AT는 차단되나 배경 휠/터치 스크롤 가능 | 모달 뒤 배경이 스크롤됨 | `use-focus-trap.ts`(scroll lock 없음) | 열림 동안 `overflow:hidden` 잠금 | B |
| A-7 | P2 | 접근성/이미지 | 홈·상세 | `mock-charts.tsx` 데이터 차트 SVG에 `role="img"`/`aria-label`/`<title>`/`aria-hidden` 전무(내부 `<text>` 노출) | SR이 맥락 없는 숫자 텍스트 노출 | `mock-charts.tsx:10,35,66`, `post-card.tsx:169-189` | `role="img"`+`aria-label` 또는 캡션 authoritative면 `aria-hidden` | B |
| A-8 | P2 | 접근성/모션 | 로딩 전역 | 스켈레톤 `animate-pulse`가 `motion-safe`/`motion-reduce` 미가드(전역 reduced-motion 규칙도 없음). 스피너 Orb는 `motion-safe`로 정상 | 전정 감각 민감 사용자에 지속 펄스 | `feed-skeleton.tsx:10`, `home-screen.tsx:140` 등; `foundations.html:378`도 지적 | `motion-reduce:animate-none` 또는 전역 미디어쿼리 | B |
| A-9 | P2 | 접근성/색상 | 상세 | 출처 신뢰도 점이 **색만으로** mid(amber)/high(green) 구분, 인접 텍스트 없음 | 색각 이상 사용자 신뢰도 구분 불가 | `report-screen.tsx:219-223` | 텍스트/`aria-label` 병기 | B |
| A-10 | P2 | 접근성/상태 | 홈 | `FailedReports`에 `aria-live` 없음(`PreparingReports`는 있음) → refetch로 실패 등장 시 미안내. skip-link 전무. focus-ring 일부 미적용(UA 기본 outline로 대체) | SR 안내 누락, 키보드 편의 저하 | `failed-reports.tsx:19`, skip grep 0, `post-card.tsx:101` 등 | `aria-live="polite"` 추가, skip-link, focus-ring 일관 적용 | B |
| C-1 | P2 | 공통컴포넌트 | 전역 | 공통 `Button`(`ui/button.tsx`)이 2개 파일만 사용, 나머지는 raw `<button>`/`<Link>` pill로 재구현(41곳/17파일). **단 `.focus-ring` 적용되어 접근성·동작 정상** → 사용자 영향 없음, 유지보수 P2 | 사용자 영향 없음. 스타일 표류·유지보수 비용 | `ui/button.tsx:44`(사용 `login-form`·`signup-form`만), raw 41곳 | Button에 `product` size/variant 추가 후 반복 pill 수렴 | D |
| C-2 | P2 | 공통컴포넌트 | 홈·상세 | 인증복원 오류 카드("인증 상태를 확인하지 못했어요"+다시 시도)가 2곳 인라인 구현, 나머지 동일 의미는 `StateView`/`PageState` 사용 | 사용자 영향 없음(일관성) | 인라인 `home-screen.tsx:204-234`·`report-screen.tsx:399-436` vs 정상 `card-detail-screen.tsx:173`·`wiki-screen.tsx:155` | 인라인 2곳을 `StateView`/`PageState`로 | D |
| C-3 | P2 | 공통컴포넌트 | 홈·상세·nav | Avatar(이니셜 원, me/other) 컴포넌트 없이 4~5곳 인라인; "왜 나에게 왔나" reason chip 3~4곳; rail 패널+`h4` 헤더 5곳; 모달 shell(portal+backdrop+dialog) 2곳; 입력 클래스 문자열 중복 | 사용자 영향 없음(중복) | `post-card.tsx:36`, reason `post-card.tsx:89`/`feed-card.tsx:33`, rail `side-right.tsx`/`report-screen.tsx:289`, shell `add-material-modal.tsx:120`/`guest-gate-modal.tsx:74` | `Avatar`/`Reason`/`RailPanel`/`ModalShell` 추출 | D |
| P3-1 | P3 | 공통컴포넌트 | 상세 | Source Trust Row가 `report-screen`(mock, trust dot) vs `card-detail-screen`(실 URL, dot 없음)로 분기 | — | `report-screen.tsx:210`, `card-detail-screen.tsx:97` | 실 API 확정 후 통합 | (보류) |
| P3-2 | P3 | 공통컴포넌트 | 전역 | 화면별 bespoke 스켈레톤(레이아웃이 실제로 다름) | — | `home-screen.tsx:130`, `report-screen.tsx:358` 등 | `bar` 원자만 공유, 레이아웃은 유지 | (보류) |

---

## 5. UI Kit ↔ React 구현 대조

기준: `docs/design-handoff/components/ui-kit.html`. 상태 — **A**=공유 구현+재사용 · **B**=화면별 중복 · **C**=정의됐으나 React 미구현(대개 미구현 화면) · **D**=kit과 의도적 상이/kit 밖.

| UI Kit 항목 | React 구현 | 상태 | 차이/비고 |
|---|---|---|---|
| Navigation / Global | `home-nav.tsx:21` `HomeNav` | A | 검색·알림은 `aria-disabled` 시각 전용(P1 스텁). 로고 Link 아님(R-1) |
| Navigation / Left Menu | `side-left.tsx:16` `SideLeft` | A | member 텍스트+guest 아이콘 내비. ≤1100px 숨김(R-1) |
| Navigation / Tab | `home-screen.tsx` `TabButton`(인라인) | B/D | `ui/`로 미추출, 단일 소비자라 위험 낮음. 화살표키 없음(A-5) |
| Navigation / Back(Read Bar) | 인라인 `report-screen.tsx:111`·`card-detail-screen.tsx:59` | B | 2곳 인라인, 액션 슬롯만 다름(C-3/PR D) |
| Button / Product | `ui/button.tsx` 존재하나 **우회**, raw `<button>` 다수 | B | C-1. focus-ring 적용되어 접근성은 정상 |
| Button / Auth | `auth/google-button.tsx` 공유; "이메일로 계속하기"는 `signup/page.tsx:37` 인라인 | A/B | Google 공유, email pill 일회성 |
| Input / Text·Password | `ui/input.tsx` | A | 호출부마다 `h-[46px]` override(문자열 중복, C-3) |
| Input / Search | `home-nav.tsx:82` 시각 전용(aria-disabled) | C(부분) | 기능 검색·`.kb-search` 미구현 |
| Input / Toggle Switch | — (설정은 segmented control 사용) | C | `.sw` 미렌더 |
| Card / Report(Text/Single/Grid) | `post-card.tsx:16` `PostCard` | A | mock. media variants 존재 |
| Card / Today Briefing | — (`FeedRec`에서 의도적 제거) | C | 개인 "나만 보기" 블록 미구현 |
| Card / Knowledge·Saved·Notification·Search | — | C | 지식창고·보관함·알림·검색 미구현 |
| Card / Wiki Interest | `wiki-interests.tsx:72` `InterestCard` | D | kit `.wcard`(pin/confidence) 대신 상대강도 bar+근거 — **의도적 재설계**(confidence 숨김) |
| Modal(form) | `add-material-modal.tsx:38` | A | 단일 공유. max-height 없음(R-2) |
| Modal / Guest Signup | `guest-gate-modal.tsx:24` | A | signup+error 모드 |
| Guest Sticky CTA / Signup Panel | `report-screen.tsx`·`guest-signup-panel.tsx:11` | A | 각 1소비자 |
| Toast | 인라인 `report-screen.tsx:342`(aria-live) | C(부분) | 공유 `Toast` 없음, ad-hoc 1곳 |
| State / Loading·Empty·Error·Permission·Analyzing | `ui/state-view.tsx`+`ui/page-state.tsx`+`ui/state-icons.tsx` | A | **가장 잘 수렴된 영역.** 예외: 인증복원 오류 2곳 인라인(C-2) |
| Skeleton | `feed-skeleton.tsx:6` 공유 + 인라인 다수 | A/B | 화면별 bespoke(P3-2). reduced-motion 미가드(A-8) |
| Avatar | 인라인 다수, primitive 없음 | B | C-3 |
| Right Rail Panel | 인라인 5곳 | B | C-3 |
| Source Trust Row / Metadata | 인라인 | B/D | P3-1 |
| Markdown Viewer | `.md-viewer`(`globals.css:232`) + `report-body-*` | A | kit 지침대로 컨테이너 스코프 |
| Theme segmented control | `settings-screen.tsx:113` `ThemeModeSegment` | D | kit에 없음. radiogroup+roving tabindex(접근성 우수) |
| Admin Table/Badge/403 | — | C(REF) | kit "승격 금지" |

---

## 6. 공통 컴포넌트 후보 (통합 판단)

className만 유사한 것은 중복이 아니다. 의미·상태·상호작용이 같은 것만 후보로 둔다.

| 후보 | 공유 대상 | 중복 위치 | 동일 의미? | 결정 | 등급 |
|---|---|---|---|---|---|
| 반복 pill → `Button` variant | `ui/button.tsx` | raw `<button>` 41곳/17파일 | 예(primary/ghost/sm 역할 동일) | 수렴(`product` size 추가) | P2 |
| 인증복원 오류 카드 → `StateView` | `StateView`/`PageState` 존재 | `home-screen.tsx:204`·`report-screen.tsx:399` | 예 | 수렴 | P2 |
| `Avatar` 추출 | 없음(kit Avatar P0) | `post-card.tsx:36`·`report-screen.tsx:154,252,268`·`home-nav.tsx:152` | 예 | 추출 | P2 |
| `Reason` 추출 | 없음(kit `.reason` "별도 컴포넌트") | `post-card.tsx:89`·`feed-card.tsx:33`·`card-detail-screen.tsx:80` | 예 | 추출(Topic Tag와 구분) | P2 |
| `RailPanel` 추출 | 없음 | `side-right.tsx`·`report-screen.tsx:289,308,324`·`wiki-screen.tsx:117` | 예 | 추출 | P2 |
| `ModalShell` 추출 | focus-trap은 이미 공유 | `add-material-modal.tsx:120`·`guest-gate-modal.tsx:74` | 예(구조) | 추출(본문은 분리) | P2 |
| 입력 클래스 상수 | `ui/input.tsx` | `login-form.tsx:17`·`signup-form.tsx:19`·`add-material-modal.tsx:21` | 예 | 상수 1개로 hoist | P2(사소) |
| Read Bar | 없음 | `report-screen.tsx:111` vs `card-detail-screen.tsx:59` | 부분 | 액션 슬롯 갖는 `ReadBar` | P2 |

### 과잉 추상화 금지 (지금 분리 상태 유지 — 통합하면 의미 훼손)

- **5개 상태 계열은 반드시 분리 유지** (여러 개가 `StateView`를 경유하더라도):
  1. 목록 조회 오류+재시도(`member-feed.tsx:31`, `feed-rec.tsx:26`, `wiki-*`) — 일시적·재시도 가능
  2. 개별 생성 실패 "생성 실패"(`failed-reports.tsx` `ErrorSlot`) — 재시도 없음·CTA 없음·자연 복구 문구
  3. Empty 온보딩 "아직 받은 보고서가 없어요"(`empty-my-reports.tsx`) — 액션=자료 추가
  4. 게스트 접근 제한/로그인 필요(`report-screen.tsx:442`, `GuestGateModal` 등) — 인증 CTA
  5. PREPARING "분석 중"(`preparing-reports.tsx`, `report-screen.tsx:496`) — 진행 중·`aria-live`·회전 Orb
  특히 2번과 5번은 카드 골격(`rounded-[14px] … flex items-start gap-3`)이 아이콘·배지 톤만 다르므로 합치면 실패/진행이 뒤섞인다. 두 파일 주석이 명시적으로 이를 경계한다.
- **pill 배지 4의미**(metadata 태그 / status-진행 "분석 중" / status-오류 "생성 실패" / 출처 "LLM 추론")는 kit §06이 별도 컴포넌트로 규정. metadata(category+domain)만 통합 가능, status·provenance는 분리.
- **Reason Chip ≠ Topic Tag** (kit §14 "합치지 말 것" — reason은 제품 핵심 개인화 신호).
- **Guest Panel / Gate Modal / Sticky CTA** — kit §09 의도적 3분리(같은 시각 언어, 다른 배치·트리거).
- **`InterestCard`(상대강도 재설계) ≠ kit `.wcard`** — 의도적 divergence(confidence 숨김). 디자인 결정 없이 "kit로 복원" 금지.

---

## 7. 반응형 감사

### 브레이크포인트 시스템 (모든 판단의 토대)

**code-certain.** 전 코드 grep 결과 표준 반응형 유틸(`sm:/md:/lg:/xl:/@container/min-[`)은 `md:text-sm`(`ui/input.tsx:11`, shadcn 기본) **단 1곳**뿐. 나머지 반응형은 **열을 삭제만 하는** arbitrary `max-[…]:hidden` 3종:
- `max-[900px]:hidden` — auth 브랜드 패널(`auth-shell.tsx:21`)
- `max-[1100px]:hidden` — 좌측 내비 `SideLeft`(`side-left.tsx:31,60`)
- `max-[1240px]:hidden` — 모든 우측 rail(`side-right.tsx:9`, `guest-signup-panel.tsx:13`, `wiki-screen.tsx:116`, `report-screen.tsx:286`)

즉 고정 데스크톱 3열 셸(`max-w-[1440px]` + `w-[300px]`+`max-w-[760px]`+`w-[300px]`)이 폭이 줄면 옆 열을 떨어뜨릴 뿐 재배치하지 않는다. **중앙 본문 열은 `min-w-0 flex-1 max-w-[760px]`라 320/390px에서도 가로 오버플로 없이 정상 리플로우**한다(오탐 방지 — 이건 정상). 참고: 목업 `product-components.css`의 미디어쿼리(`@media(max-width:1060px)`)는 앱이 `base.css`를 import하지 않아 **죽은 참조**다.

### P1 (3건 모두 브라우저 재현 확정 2026-07-28)
- **R-1 모바일 내비 전무** — §2·§4 참조. 대체 내비 grep(`hamburger|drawer|Sheet|bottom-nav|☰|≡`) 0건으로 부재 확정. `/wiki`·`/settings` 링크는 숨겨진 `SideLeft`와 `empty-my-reports.tsx:31`(→/wiki) 외 전무. **재현: 390px·768px에서 SideLeft 숨김·대체 내비 없음·홈/관심사/설정 이동 수단 전무.**
- **R-2 모달 max-height 없음** — **재현: 320px·200% 확대에서 모달이 viewport 높이 초과·내부 스크롤 불가·하단 저장/취소 버튼 도달 불가.**
- **R-3 상단 nav 오버플로** — **재현: 390px member 헤더에서 검색창·＋관심자료·알림·아바타 겹침 + 검색 문구 여러 줄 깨짐 + CTA 가려짐.** (원래 P2였던 member 검색창 붕괴 D2 관찰이 이 P1로 확정됨)

### P2
- R-4~R-8 (§4). 추가로 rail 숨김 순서는 우측(1240)이 좌측(1100)보다 먼저라 "좌측만 숨고 우측 남는" 깨진 중간 상태는 없다(**정상 — 오탐 방지**).

### 정상 동작 (재지적 금지)
중앙 열 리플로우, rail 숨김 순서 일관, 긴 이메일/URL/제목 대부분 가드(`break-all`/`truncate`/`min-w-0` + 전역 `overflow-wrap`), 모달 폭 `calc(100%-48px)` 가드, 마크다운 `code{overflow-x:auto}`·`table{width:100%}`.

---

## 8. 접근성 감사

**P0·P1 없음.** 모달 포커스 트랩·배경 inert 정상(포커스 탈출 없음), 핵심 컨트롤 키보드 조작 가능(테마 segmented control은 roving tabindex로 모범적), 목록 조회 오류는 Empty가 아닌 별도 `role="alert"` 오류로 렌더(혼동 없음 — `home-screen.tsx:60-67`도 READY 목록 오류를 보존함을 확인).

- **heading**: A-1(h1 없음), A-2(순서·섹션 div). 상세는 §4.
- **landmark**: A-3(main 없음).
- **폼**: A-4(login aria-invalid/describedby). signup 폼은 모범적(htmlFor·aria-invalid·aria-describedby 완비).
- **키보드**: A-5(홈 탭 화살표키·AvatarMenu 포커스·비밀번호 토글 tabIndex). 클릭 가능 div/span 남용 없음(모달 백드롭만, Esc+내부 버튼으로 보완).
- **모달**: A-6(scroll lock만 누락). 나머지(role=dialog·aria-modal·라벨·트랩·복원·inert·Esc) 전부 정상.
- **이미지**: A-7(mock-charts SVG). 나머지 장식 SVG는 `aria-hidden` 정상.
- **모션**: A-8(스켈레톤 reduced-motion 미가드).
- **색상 단독**: A-9(신뢰도 점). 나머지는 텍스트 병기 규율 양호(`wiki-interests.tsx`는 "색만으로 전달 안 함" 주석까지).
- **기타**: A-10(FailedReports aria-live·skip-link·focus-ring 일관성).

---

## 9. 화면별 체크

- **공개 피드(홈 [피드])**: 카드 렌더·reason·미디어 정상. h1 없음(A-1), 카드 액션 focus-ring 일부 누락(A-10), 320px 압축(R-4).
- **회원 홈 [내 보고서]**: PREPARING→ERROR→READY→Empty 분기 견고, 상태 계열 분리 우수(§6). FailedReports aria-live 누락(A-10). **Empty 온보딩 본문 카드는 390px·768px에서 큰 깨짐 없이 정상 표시됨을 브라우저에서 확인(2026-07-28)** — 중앙 본문 열이 `min-w-0 flex-1 max-w-[760px]`라 리플로우가 정상이라는 §7 판단과 일치. (단, 이 화면으로 이동하는 내비 자체는 ≤1100px에서 부재 — R-1)
- **Wiki**: h1 있음, InterestCard 키보드 토글 정상. rail heading 스킵(A-2), rail은 ≤1240 숨김.
- **설정**: 테마 segmented control 접근성 모범. 섹션이 heading 아님(A-2). 계정 이메일 `break-all` 처리됨. ≤1100 도달 경로 없음(R-1).
- **보고서 상세**: 마크다운 뷰어·상태 분기 양호. 출처 색상 단독(A-9), 출처명 truncate 누락(R-7), 섹션 div(A-2).
- **인증(로그인/가입)**: 폼 접근성(signup 모범, login A-4). h2-before-h1(A-2), 좁은 폭 패딩(R-5).
- **공통 내비·모달**: 모달 접근성 우수(scroll lock만, A-6). 상단 nav 오버플로(R-3, 390px 재현)·모바일 내비 부재(R-1, 390·768px 재현)·`AddMaterialModal` 스크롤 불가(R-2, 320px·200% 재현) 모두 브라우저 재현 확정.

---

## 10. 권장 PR 계획

파일 충돌 큰 항목을 분리하고, 카테고리 이름 맞추려 억지로 묶지 않는다.

### PR A — 실제 사용자를 막는 반응형 P1 (최우선)
- R-1 반응형 내비게이션(≤1100px 햄버거/드로어 또는 하단 탭 + 로고 `/` Link)
- R-2 `AddMaterialModal` `max-h`+`overflow-y-auto`(200% 줌도 해소)
- R-3 상단 nav 행 wrap/축소 가드
- 근거: 접근성엔 P1이 없어 PR A는 반응형 P1 3건으로 구성. R-1은 범위가 커 단독 PR로 분리 가능.

### PR B — 접근성 구조·폴리시 (P2)
- A-1 h1 추가(홈·error·404·전체상태), A-3 `<main>` 래핑, A-2 heading 순서/섹션 heading화
- A-4 login describedby, A-5 홈 탭 화살표키·비밀번호 토글, A-6 모달 scroll lock
- A-7 mock-charts `role=img`/`aria-hidden`, A-8 스켈레톤 reduced-motion, A-9 신뢰도 텍스트 병기, A-10 FailedReports `aria-live`·skip-link·focus-ring 일관
- 대부분 소규모·독립적 → 함께 묶기 적합.

### PR C — 반응형 중간 수정 (P2)
- R-4 카드 320px, R-5 auth 패딩, R-6 guest CTA, R-7 출처명 truncate, R-8 고정 높이 줌

### PR D — 공통 컴포넌트 정리 (P2, 사용자 영향 없음)
- C-1 `Button`에 `product` size/variant 추가 후 반복 pill 수렴
- C-2 인증복원 오류 인라인 2곳 → `StateView`/`PageState`
- C-3 `Avatar`·`Reason`·`RailPanel`·`ModalShell`·입력 클래스 상수 추출
- **§6 과잉 추상화 금지 가드레일 준수**(5개 상태 계열·4 배지 의미·Reason≠Tag·guest 3분리·InterestCard divergence 유지).

> 순서·규모는 실제 착수 시 조정. PR A는 R-1 단독 + (R-2,R-3) 소규모 2건으로 나눠도 좋다.

---

## 11. API·정책 의존으로 보류할 항목

미구현 화면(온보딩·보관함·지식창고·프로필·알림·검색·비밀번호 재설정·토픽)은 대응 API/정책 확정 전이라 이 감사의 결함이 아니다. 또한:
- 검색·알림(상단 nav 스텁)은 기능 API 확정 후 활성화 — 지금은 `aria-disabled` 시각 전용(정상 처리).
- P3-1 Source Trust Row 통합 — 실 상세 API 확정 후.
- 설정의 브리핑 설정 등 확장 — 백엔드 확정 후.
- 관심사·저장·SNS 공개·Wiki 실데이터·보고서 생성/재시도 API — 계약 확정 후.

---

## 12. 브라우저 수동 QA 체크리스트 (사용자 확인 권장)

**재현 완료 (2026-07-28, 사용자 브라우저 확인):**
- [x] **R-1** — 390px·768px: `SideLeft` 숨김·대체 모바일/태블릿 내비 없음·홈/관심사/설정 이동 수단 전무
- [x] **R-2** — 320px·200% 확대: 모달 내용이 viewport 높이 초과·모달 내부 스크롤 불가·하단 저장/취소 버튼 미표시·도달 불가
- [x] **R-3** — 390px member 헤더: 검색창·＋관심자료 CTA·알림·아바타 겹침 + 검색 문구 여러 줄 깨짐 + CTA 가려짐
- [x] Empty 온보딩 본문 카드 — 390px·768px에서 큰 깨짐 없음(정상 리플로우)

**잔여 확인 필요(코드로 단정 못 한 항목):**
- [ ] R-4(카드 320px 압축)·R-5(auth 패딩)·R-7(출처명 truncate)·R-8(고정 px 높이 200% 줌 잔여) 실제 렌더 — 1024/1100/1240/1440px 중간 폭 포함
- [ ] 스크린리더로 홈·error·404 heading 탐색(h1 부재 체감) — A-1
- [ ] 스크린리더로 `mock-charts` 노출 방식 — A-7
- [ ] 출처 신뢰도 점이 색만으로 구분되는지(디자인 의도 확인 포함) — A-9
- [ ] `prefers-reduced-motion` 켠 상태에서 로딩 스켈레톤 펄스 — A-8
- [ ] 모달 열림 중 배경 스크롤 잠금 여부 — A-6
- [ ] 라이트·다크 모드 대비(실측 도구로 AA) — 토큰 매핑은 `globals.css`에 완비, 실측만 필요

---

## 13. 검사 결과

기준 브랜치 `chore/yeojin-p2-audit`, 워킹트리 clean(앱 코드 무수정, 이 문서만 추가). 결과는 현재 상태를 반영하며 다른 미커밋 변경은 없다.

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | exit 0 (오류 없음) |
| `npm run lint` | exit 0 — 0 errors, warning 1(`docs/design-handoff/shared/product-common.js:530` `no-unused-expressions`, 감사·앱과 무관한 기존 목업 JS) |
| `npm run build` | exit 0 (정상 빌드) |

---

### 부록 — 근거 수집 방식
- 정적 근거는 `app/**`·`components/**`·`hooks/**`·`lib/**` 직접 읽기와 grep으로 수집(파일:라인 명시).
- UI Kit·토큰·focus-trap·화면 매핑은 직접 정독(`ui-kit.html` 702줄, `globals.css`, `use-focus-trap.ts`, `HTML_MOCKUP_INDEX.md`).
- 헤드라인 주장은 재검증: `Button` import 2파일·raw `<button>` 41곳, 로고 `<div>`, 모달 `max-h` 부재, h1 부재 화면, reduced-motion 미가드 — 모두 grep/read로 확인.
