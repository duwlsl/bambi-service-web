# 밤새비서(BamBi) — 서비스 웹 프론트엔드

> 웹 클리핑·사용자 입력 기반 AI 관심사 분석 및 개인화 브리핑 서비스
>
> AlphaCatcher 팀 프로젝트에서 **프론트엔드를 단독으로 담당**해 Next.js(App Router)·TypeScript로 16개 라우트를 구현했습니다.

| | |
|---|---|
| 서비스 | 밤새비서(BamBi) — 웹 클리핑·사용자 입력 기반 AI 관심사 분석 및 개인화 브리핑 서비스 |
| 팀 | AlphaCatcher (백엔드 · LLM · 프론트엔드 · 관리자 웹 분업) |
| 나의 역할 | **프론트엔드 단독 담당** — 화면 구현, API 연동 계층, 인증·비동기 상태 설계, 프론트엔드 테스트·검증 CI 구성 |
| 기술 | Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · Vitest + MSW · Playwright |
| 기간 | 2026-07 ~ 2026-08 (저장소 커밋 기준) |
| 프로젝트 결과 | 한경×토스뱅크 FullStack·LLM 부트캠프 파이널 프로젝트 2위 *(팀 공동 성과)* |
| 이 저장소 | 팀 원본 저장소의 **개인 Fork**, 프로젝트 종료 후 포트폴리오용 문서 정리 |

---

## 1. 저장소 안내

- 이 저장소는 팀 프로젝트 원본 저장소 **[hk-toss-final-project/bambi-service-web](https://github.com/hk-toss-final-project/bambi-service-web)** 의 **개인 Fork** 입니다.
- 팀 프로젝트 당시의 **구현 내용과 커밋 이력을 그대로 유지**하고 있습니다.
- 저는 이 저장소에서 **팀의 단독 프론트엔드 담당자**로 참여했습니다.
- 팀 프로젝트 종료 시점의 코드는 기존 Git 이력으로 보존하며, **종료 후 개인 개선은 별도 브랜치와 PR로 구분해 `main`에 반영**합니다.
- **개인 코드 개선을 시작했습니다.** 진행한 작업은 [12. 프로젝트 종료 후 개인 개선 계획](#12-프로젝트-종료-후-개인-개선-계획)에 팀 프로젝트 당시 작업과 구분해 기록합니다.

> 이 문서는 저장소의 코드·설정·Git 이력으로 확인한 내용만 담았습니다.

---

## 2. 프로젝트 개요

### 서비스 흐름

1. 사용자가 크롬 확장(클리퍼)이나 웹의 `＋ 관심 자료` 모달로 웹 페이지를 저장합니다.
2. 백엔드·LLM 파이프라인이 저장 자료에서 **관심사를 추론**하고, 매칭된 정보로 **보고서(카드)** 를 만듭니다.
3. 웹은 그 결과를 **출처가 붙은 카드 피드 · 상세 브리핑 · 관심사 Wiki** 로 보여줍니다.

### 아키텍처 경계 (프론트엔드 관점)

```
브라우저 / Next.js Web
        ↓  (프론트가 호출하는 대상)
   Bambi Service API
        ↓
 Agent API(LLM) · DB · 내부 서비스
```

프론트엔드는 Service API만 호출합니다. Agent(LLM) API 직접 호출, DB 접근, 브라우저 내 LLM 키 사용은 하지 않으며,
비즈니스 로직과 AI 처리는 서버에 두고 **서버가 내려준 데이터를 화면 상태로 표현하는 일**에 집중했습니다.

---

## 3. 핵심 기능

구현한 라우트는 16개이며, 기능 단위로 묶으면 다음과 같습니다.

| 영역 | 라우트 | 내용 |
|---|---|---|
| 인증 | `/login` · `/signup` · `/signup/email` | 이메일 가입·로그인, 인라인 오류, 중복 제출 방지, `returnTo` 복귀 |
| 온보딩 | `/onboarding` | 관심사 1~12개 선택(taxonomy + 직접 입력) → 저장 → 완료 → 클리퍼 설치 안내 |
| 홈 피드 | `/` | 내 보고서(날짜 그룹)·공개 피드 탭, 처리중·실패 슬롯, 온디맨드 생성 패널, 게스트 열람 |
| 보고서 | `/report/[id]` · `/reports` | 카드 → 리포트 본문(Markdown) 2단계 로딩, 출처 표시, 좋아요·보관·공개범위 전환, 아카이브 검색·필터 |
| 관심사 Wiki | `/wiki` · `/wiki/graph` | AI 추론 관심사를 대분류로 묶어 표시, 발견 관심사 추가·삭제, 지식 그래프 |
| 소셜 | `/profile` · `/users/[publicId]` · `/scraps` | 공개 프로필, 팔로우, 팔로워·팔로잉 목록, 프로필 편집, 북마크 |
| 알림·설정 | `/notifications` · `/settings` · `/oauth/authorize` | 알림 폴링·읽음 처리, 테마·보고서 설정·MCP 키, 외부 AI 연결 승인 |

---

## 4. 나의 역할과 주요 기여

팀에서 **프론트엔드를 혼자 담당**했고, 아래 영역을 설계·구현했습니다.

| 영역 | 기여 내용 |
|---|---|
| 화면 구현 | 16개 라우트의 화면 구조·상호작용·상태 처리 |
| API 연동 계층 | 공통 API client 위에 repository(엔드포인트 매핑)·adapter(화면 모델 변환) 계층 구성 |
| 인증·세션 | JWT 저장·주입·만료 처리, 세션 복구 규칙, 게스트 게이트, 복귀 경로 검증 |
| 비동기 상태 | 조회용·폴링용 훅을 분리한 상태 프리미티브와 공통 Loading / Empty / Error 뷰 |
| 접근성 | 모달 포커스 트랩·배경 inert, 아이콘 버튼 접근 가능한 이름, 탭 키보드 이동, `aria-current` |
| 테스트·CI | node:test · Vitest(RTL + MSW) · Playwright 도입, 프론트엔드 검증 CI 구성 |

> 이 저장소의 결과물은 **팀 공동 성과**입니다. 배포 파이프라인·백엔드 API·LLM 파이프라인은 팀원이 담당했고,
> 위 표는 그중 제가 담당한 프론트엔드 범위를 정리한 것입니다.

---

## 5. 기술 스택

| 구분 | 사용 기술 | 사용 목적 |
|---|---|---|
| 프레임워크 | Next.js 16 (App Router) | 라우트별 서버 컴포넌트에서 메타데이터·id 형식 검증을 처리하고, 상호작용 화면만 클라이언트 컴포넌트로 분리 |
| 언어 | TypeScript 5 (`strict`) | API 응답 타입과 화면 모델 타입을 분리해 관리 |
| UI | React 19, Tailwind CSS v4, shadcn/ui(radix-ui), lucide-react | 디자인 토큰(CSS 변수) 위에 얇게 얹어 목업의 시각 언어를 유지 |
| 테스트 | node:test, Vitest 4, Testing Library, MSW, Playwright | 순수 로직은 node:test, 화면·네트워크 계약은 Vitest + MSW, 핵심 흐름은 E2E |
| 품질 | ESLint 9(`eslint-config-next`), `tsc --noEmit` | PR마다 CI에서 lint·타입 검사를 빌드보다 먼저 실행 |
| 배포 *(팀 프로젝트 당시)* | Docker(멀티스테이지, `output: "standalone"`), GitHub Actions, GHCR | 빌드는 CI에서 하고 서버는 이미지 pull만 수행 *(팀 공동 성과)*. **개인 Fork에는 배포 환경이 없고 Docker 빌드 검증만 합니다** |

---

## 6. 프론트엔드 구조와 데이터 흐름

```
app/**/page.tsx (서버)     라우트 진입 · 메타데이터 · id 형식 검증(UUID 아니면 404)
        ↓
*-screen.tsx (클라이언트)   인증 상태 분기 + 화면 조립
        ↓
hooks/use-*.ts             loading / success / empty / error 상태 소유, refetch·폴링
        ↓
lib/repositories/*.ts      엔드포인트 1:1 매핑 · 응답 형태 검증
        ↓
lib/api-client.ts          base URL 결정 · Bearer 주입 · 공통 envelope 해석 · ApiError 변환
        ↓
Bambi Service API
```

- 컴포넌트에서 직접 `fetch` 하지 않고 [lib/api-client.ts](lib/api-client.ts) 한 곳을 거치도록 했습니다. 여기서 base URL 결정과 인증 헤더 주입을 함께 처리합니다.
- 서버 응답은 공통 envelope `{ success, data, error }` 로 해석하고, 실패는 `ApiError(code, status)`로 변환합니다.
- 서버 원문 `error.message`는 화면에 노출하지 않고, **에러 코드 → 사용자 문구 매핑을 [constants/errors.ts](constants/errors.ts) 한 곳**에 모았습니다.
- 화면 표시용 변환은 `lib/adapters/*`, 계산 로직은 `lib/*.ts` 순수 함수로 분리해 단위 테스트가 가능하게 했습니다.
- API base URL은 `getApiBaseUrl()` 한 곳에서만 결정합니다. `NEXT_PUBLIC_API_URL`이 비어 있으면 same-origin 상대경로 `/api/*`로 요청하므로, 코드에 운영 주소를 하드코딩하지 않아도 환경별 배포가 가능합니다.

---

## 7. 주요 UX·기술적 의사결정

### 공개 화면과 인증 전용 동작을 분리한 인증 상태 설계

클라이언트 중심의 JWT 인증 구조로 인해 서버에서 최초 인증 상태를 판정하기 어려웠습니다. middleware 라우트 가드를 두는 대신,
각 화면이 `loading → 스켈레톤 / error → 복구 오류 / guest → 접근 제한 / authenticated → 본문` 네 갈래를 같은 패턴으로 처리하도록 했습니다.

- 홈·보고서 상세·공개 프로필은 **비로그인도 그대로 열람**하고, 저장·좋아요·댓글처럼 인증이 필요한 동작에서만 가입 유도 모달로 안내합니다.
- 토큰 만료(`AUTH_INVALID_TOKEN`)를 만나면 공통 client가 토큰을 지우고 이벤트를 발행해 같은 탭의 인증 상태를 게스트로 동기화합니다.
  이때 자동 재요청이나 리다이렉트를 하지 않아 만료 상황에서 요청·이동이 반복되지 않도록 했습니다.
- 로그인 후 복귀 경로(`returnTo`)는 [lib/safe-return-path.ts](lib/safe-return-path.ts)에서 현재 origin의 앱 경로만 허용해 외부로의 리다이렉트를 막았습니다.

### 일반 조회와 배경 폴링을 별도 훅으로 분리

사용자가 누르는 재시도는 `loading`으로 되돌아가는 편이 자연스럽고, 30초 간격 배경 폴링은 기존 데이터를 유지해야 합니다.
두 동작을 한 훅에 섞는 대신 [hooks/use-async-data.ts](hooks/use-async-data.ts)(조회 + 재시도)와
[hooks/use-polled-data.ts](hooks/use-polled-data.ts)(stale-while-revalidate 폴링)로 나눴습니다.
기존 훅을 수정하지 않고 새 훅을 추가하는 방식이라 이미 붙어 있던 화면의 회귀 위험 없이 폴링 화면만 옮길 수 있었습니다.

### API가 없는 기능은 가짜 UI로 만들지 않기

목업에 있어도 대응 API가 없으면 구현하지 않았습니다(회원 탈퇴·브리핑 시간·요금제·조회수 등).
자리만 잡아둔 비활성 토글이나 가짜 기본값 대신 **실제로 동작하는 범위만** 화면에 올렸습니다.
디자인 검증이 필요한 부분은 mock을 `lib/mock` + adapter seam으로 격리하고 기본값을 실 API 모드로 두어,
운영 빌드에 데모 데이터가 섞이지 않게 했습니다.

---

## 8. 대표 트러블슈팅

### 화면 상태 전환 때 헤더가 재마운트되어 알림 API가 중복 호출된 문제

- **문제** — 보고서 상세에 한 번 들어갈 때마다 `GET /api/notifications`가 2회 발생했습니다. 개발 모드 전용 현상이 아니라 프로덕션 빌드에서도 재현됐습니다.
- **원인** — 상세 화면이 상태별로 서로 다른 컴포넌트를 루트로 반환했고(로딩 스켈레톤 → 성공 뷰), 각 갈래가 자기 안에서 헤더를 렌더했습니다. 응답이 도착해 갈래가 바뀌는 순간 헤더 하위 트리가 unmount 후 다시 mount 되면서, 헤더에 달린 알림 드롭다운이 조회를 다시 시작했습니다.
- **해결** — 상태가 바뀌어도 헤더를 포함한 셸이 유지되도록 화면 구조를 바꿨습니다.
- **회귀 방지** — MSW로 **네트워크 경계에서 요청 횟수를 세는** 테스트를 추가했습니다. 훅 내부 상태가 아니라 실제 요청 수를 검증하므로 같은 결함이 다른 경로로 재발해도 잡힙니다. ([tests/unit/card-detail-duplicate-requests.test.tsx](tests/unit/card-detail-duplicate-requests.test.tsx))

### 배경 폴링마다 기존 데이터가 사라져 알림 배지가 깜빡이던 문제

- **문제** — 30초 폴링 tick마다 알림 목록과 배지가 스켈레톤으로 되돌아가, 화면이 주기적으로 깜빡였습니다.
- **원인** — 재조회 시 `loading`으로 되돌아가도록 설계된 조회용 훅을 배경 폴링에 그대로 사용했습니다.
- **해결** — stale-while-revalidate 폴링 훅을 별도로 만들어, 최초 로드만 `loading`이고 이후 재조회는 기존 데이터를 유지한 채 `isRevalidating`으로만 표시하도록 했습니다.
- **결과** — 폴링 중 화면 깜빡임이 사라졌고, 비활성 → 활성 전환(로그아웃 후 다른 계정 로그인 등)에서는 이전 데이터를 재사용하지 않고 `loading`부터 다시 시작하도록 구분했습니다.
- **팀 프로젝트 당시의 적용 범위** — 새 폴링 훅을 실제로 붙인 곳은 LLM Wiki 빌드 상태 화면까지였고, 알림 훅은 기존 조회 훅에 남아 있었습니다. 알림 이관은 프로젝트 종료 후 개선으로 진행했습니다([12절](#12-프로젝트-종료-후-개인-개선-계획)).

<details>
<summary>그 밖에 처리한 문제들</summary>

- **실패 원인 소실** — 비동기 상태가 `status: "error"`만 남겨 권한 없음·AI 장애·네트워크 끊김이 같은 문구로 보이던 문제 → 상태에 `errorCode`를 보존하고 원인이 특정될 때만 코드별 문구로 대체
- **테마 FOUC** — 저장된 테마를 마운트 이후 적용해 첫 paint가 번쩍이던 문제 → 루트 레이아웃에서 paint 이전 인라인 스크립트로 선적용
- **시각 표기 불일치** — 예정 시각을 브라우저 로컬 시간대로 포맷해 hydration이 어긋나던 문제 → 백엔드 스케줄러와 같은 서비스 기준 시간대로 고정

</details>

---

## 9. 테스트 및 CI

| 러너 | 대상 | 결과 |
|---|---|---|
| `node:test` | 순수 로직·구현 규약 (피드 혼합, 보고서 상태·델타, 알림 이동 대상, 관심사 UX 규칙 등) | 14파일 **210 케이스 통과** |
| Vitest + Testing Library + MSW (jsdom) | 화면 렌더와 네트워크 계약 (상세 화면, 피드 오류·Empty, 모달 포커스, 중복 요청 회귀, 알림 배경 폴링) | 9파일 **51 케이스 통과** |
| Playwright (Chromium) | 홈 피드 → 보고서 상세 진입 E2E 1개. `/api/**`를 stub 해 백엔드에 의존하지 않음 | 1개 시나리오 구성 |

CI([.github/workflows/ci.yml](.github/workflows/ci.yml))는 **`main` 대상 PR · `main` push · 수동 실행(`workflow_dispatch`)** 에서 돌며, 같은 브랜치에 새 커밋이 오면 이전 실행을 취소합니다. 권한은 `contents: read`만 씁니다. *(팀 원본에 있던 `develop` 트리거는 이 Fork에 대응 브랜치가 없어 제거했습니다.)*

- **build** — `npm ci` → lint → `tsc --noEmit` → node:test → Vitest → production build (더 싼 검사에서 먼저 실패시키는 순서)
- **e2e** — Chromium만 설치해 production 빌드·기동 후 실행, 실패했을 때만 리포트 아티팩트 업로드
- **secret-scan** — gitleaks로 히스토리에서 키·토큰 커밋 여부 검사

[image.yml](.github/workflows/image.yml)(`Docker Build`)은 **개인 Fork에서는 Dockerfile이 빌드되는지만 검증**합니다 — 레지스트리 로그인·이미지 push·배포 디스패치는 없습니다.

**팀 프로젝트 당시** 이 파일은 CD였습니다: `main` push에서 GHCR로 이미지를 빌드·푸시하고 원본 조직 저장소의 배포 워크플로를 디스패치해 서버에 반영했습니다. *(배포 파이프라인은 팀 공동 성과)* 개인 Fork는 팀 인프라와 시크릿에 접근하지 않아야 하므로 그 동작을 제거했고, 배포 대상이 정해지지 않아 현재는 CI까지만 구성합니다.

---

## 10. 로컬 실행 방법과 환경변수

<details>
<summary>실행 방법 · 스크립트 · 환경변수 펼치기</summary>

패키지 매니저는 **npm**을 사용합니다(`package-lock.json` 기준).

```bash
npm ci                         # 1) 의존성 설치
cp .env.example .env.local     # 2) 환경변수 파일 준비
npm run dev                    # 3) 개발 서버 → http://localhost:3000
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm run start` | 프로덕션 빌드 / 빌드 결과 실행 |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | 타입 검사 (전용 스크립트는 없습니다) |
| `npm test` | `test:legacy` + `test:unit` |
| `npm run test:legacy` / `npm run test:unit` / `npm run test:e2e` | node:test / Vitest / Playwright |

환경변수 값은 저장소에 커밋하지 않습니다. `.env.example`에는 키만 두고 실제 값은 로컬 `.env.local`과 배포 변수로 주입합니다.
`NEXT_PUBLIC_*`은 빌드 시 번들에 인라인되므로 비밀값을 넣지 않습니다.

| 변수 | 필수 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | 선택 | Service API의 origin(scheme+host)만. 끝에 `/`나 `/api`를 붙이지 않습니다. 비우면 same-origin 상대경로 `/api/*`로 요청합니다 |
| `NEXT_PUBLIC_MCP_SERVER_URL` | 선택 | 외부 AI에 등록할 MCP 서버 URL. 설정 화면 안내에 사용 |
| `NEXT_PUBLIC_REPORT_ARCHIVE_MOCK` | 선택 | `"true"`일 때만 보고서 아카이브 mock 모드(로컬 디자인 검증용). 미설정이면 실 API 모드 |
| `NEXT_PUBLIC_DEV_REPORT_TRIGGER_ENABLED` | 선택 | `"false"`로 빌드하면 홈의 개발용 보고서 생성 트리거를 숨김 |

백엔드 API는 별도 저장소(`bambi-service-api`)에서 실행합니다. 이 저장소만 띄우면 API 응답이 필요한 화면은 오류·빈 상태로 표시되며,
테스트는 API를 stub 하므로 백엔드 없이 실행됩니다.

</details>

---

## 11. 팀 구성 및 원본 저장소

| 저장소 | 역할 | 담당 |
|---|---|---|
| **`bambi-service-web`** | 사용자용 웹 프론트엔드 | **본인 (단독)** |
| `bambi-service-api` | 서비스 백엔드 API (인증·피드·카드·관심사·소셜) | 백엔드 팀원 |
| `bambi-agent-api` | LLM 처리 (관심사 추론·보고서 생성) | LLM 팀원 |
| `bambi-admin-web` | 관리자 웹 | 팀원 |
| `bambi-build` | 로컬 실행·서버 배포 구성 | 팀원 |

- 원본 저장소: **[hk-toss-final-project/bambi-service-web](https://github.com/hk-toss-final-project/bambi-service-web)**
- 프론트엔드는 Service API만 호출하고, 필요한 API가 없으면 프론트에서 우회 구현하지 않고 **백엔드 변경 요청으로 정리해 전달**하는 방식으로 협업했습니다.

---

## 12. 프로젝트 종료 후 개인 개선 계획

팀 프로젝트 당시 작업과 구분하기 위해, 종료 후 진행한 개선은 날짜·브랜치와 함께 아래에 기록합니다.

### 진행한 작업

**2026-08-28 — 알림 배경 폴링 정합성** — `fix/notification-polling-consistency` · [PR #1](https://github.com/duwlsl/bambi-service-web/pull/1)

- 알림 조회를 `useAsyncData` + `setInterval(refetch, 30_000)` 조합에서 stale-while-revalidate 폴링 훅
  [hooks/use-polled-data.ts](hooks/use-polled-data.ts)로 이관했습니다.
- 30초 tick마다 배지·목록이 사라지던 깜빡임 제거, 백그라운드 탭 폴링 중지(visible 복귀 시 즉시 1회 재조회 후 주기 재개),
  진행 중 요청과의 중복 방지, 언마운트·로그아웃 시 타이머·리스너·요청 정리.
- **폴링 훅에 남아 있던 타이머 중복 예약도 함께 고쳤습니다** — 진행 중 요청이 있는 동안 탭이 hidden → visible로 바뀌면,
  in-flight 락에 막혀 건너뛴 복귀 조회도 다음 tick을 예약해 버려 완료 예약분과 함께 **활성 타이머가 2개**가 됐습니다
  (지역 변수는 나중 예약만 가리켜 앞선 타이머는 정리 대상에서도 빠집니다). 그 뒤로는 주기마다 요청이 2배로 나갔습니다.
  예약 전에 기존 타이머를 걷어내 **활성 타이머가 항상 최대 1개**임을 보장합니다.
- 훅의 외부 반환 계약을 유지해 소비 컴포넌트(헤더 드롭다운 · `/notifications`)는 수정하지 않았고,
  MSW로 요청 수를 세는 폴링 테스트 11건을 추가했습니다. 회귀 테스트로서의 유효성은 실제로 되돌려 실행해 확인했습니다 —
  이전 알림 훅에서 5건, 수정 전 폴링 훅에서 타이머 중복 테스트 1건이 실패합니다.

### 남은 계획

- 모바일 반응형 대응 확대
- E2E 시나리오 확대 (현재 1개 → 로그인·온보딩·자료 저장 흐름)
- node:test와 Vitest로 나뉜 테스트 러너 정리
- 서버 컴포넌트 활용 범위 재검토 (현재 대부분의 데이터 요청이 클라이언트에서 발생)
- 목록 데이터의 페이지네이션 대응 (백엔드 API 확정 시)
