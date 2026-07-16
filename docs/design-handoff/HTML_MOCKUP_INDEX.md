# HTML_MOCKUP_INDEX — HTML 목업 인벤토리 (Git 기준)

- 작성일: 2026-07-16 (구 FIGMA_HANDOFF_INDEX.md를 전면 개정)
- 기준 경로: **`docs/design-handoff/`** (bambi-service-web 저장소)
- **팀 결정 (2026-07-16):** Figma 이관 계획은 **중단**됨. HTML 목업을 **Git 저장소에서 직접 관리·공유**한다. Figma MCP 호출·Frame 변환은 진행하지 않으며, 과거 Figma 이관 계획은 현재 작업 기준으로 사용하지 않는다.

## 1. 사용 목적

- 화면·상태 목업의 **기준 파일** 안내 (프론트 구현 시 이 목록의 파일을 참고)
- 팀 리뷰용 HTML 인벤토리 — 기본 화면과 상태 variant 구분
- 목업 완성도·검수 상태 관리
- 현재 확정 화면과 Pending Decision 항목 구분

## 2. 확인 방법

### 로컬에서 확인

프로젝트 루트에서:

```bash
python -m http.server 8000
```

브라우저에서 아래 형식으로 접속한다.

```text
http://localhost:8000/docs/design-handoff/product/home-feed.html
http://localhost:8000/docs/design-handoff/variants/home-my-reports-states.html
```

HTML 파일을 직접 더블클릭해 열 수도 있지만, 상대 CSS·JS 경로와 파일 간 라우팅(`data-screen` 링크) 확인을 위해 **로컬 서버 방식을 권장**한다.

### Git 공유

- HTML·CSS·JS 파일을 저장소에 함께 커밋한다.
- Pull Request 또는 브랜치 링크로 팀 리뷰를 진행한다 (PR 본문에 검수 대상 HTML 경로를 정리).
- 정적 배포가 필요하면 GitHub Pages 또는 프로젝트의 기존 정적 호스팅 방식을 사용한다.

상태 variant 파일 상단의 상태 전환 버튼·다크 모드 버튼은 **목업 검수 전용 컨트롤**이며 실제 제품 UI가 아니다.

## 3. 기본 제품 화면 (15)

경로는 `docs/design-handoff/` 기준 상대 경로. 구현 우선순위는 `bambi-service-web/CLAUDE.md` §2(P0 4화면) 기준.

| 구분 | 파일 경로 | 화면명 | 용도 | 상태 | 구현 우선순위 |
|---|---|---|---|---|---|
| Auth | product/auth-login.html | 로그인 | 이메일 로그인 (한 파일에 시작하기/계정 만들기/로그인 3뷰) | Final | P0-1 |
| Auth | product/auth-signup-choice.html | 가입 방식 선택 | 회원가입 진입 | Final | P0-2 |
| Auth | product/auth-signup-email.html | 이메일 회원가입 | 이메일 가입 폼 | Final | P0-2 |
| Home | product/home-feed.html | 홈 — 공개 피드 | 피드 탭 기본 + 관심 자료 모달 | Final | P0-3 |
| Report | product/report-detail.html | 콘텐츠 상세 | 마크다운 보고서·출처·메모 | Final | P0-4 |
| Home | product/home-my-reports.html | 홈 — 내 보고서 | 내 보고서 탭 기본 | Final | P1 |
| Onboarding | product/onboarding.html | 온보딩 — 관심사 선택 | 관심사 선택 → 첫 브리핑 안내 | Final | P1 |
| Library | product/saved.html | 보관함 | 타인 공개 보고서 북마크 | Final | P1 |
| Library | product/library.html | 지식창고 | 내 보고서 아카이브·검색 | Final | P1 |
| Wiki | product/wiki.html | 관심사 관리 (LLM Wiki) | AI 이해 확인·오버라이드 | Final | P1 |
| Profile | product/profile-self.html | 본인 프로필 | 내 공개 브리핑·스탯 | Final | P1 |
| Profile | product/profile-user.html | 타인 프로필 | 팔로우·공개 브리핑 | Final | P1 |
| System | product/notifications.html | 알림 | 브리핑 도착·조건 달성·소셜 | Final | P1 |
| System | product/search.html | 검색 | 토픽·보고서·사용자 통합 검색 | Final | P1 |
| System | product/settings.html | 설정 | 계정·브리핑 설정 | Final | P1 |

## 4. 상태 및 Variant 목업 (12)

| 파일 경로 | 기준 화면 | 포함 상태 | 용도 | 상태 |
|---|---|---|---|---|
| variants/home-my-reports-states.html | 홈 — 내 보고서 | 첫 브리핑 생성 중 / 첫 브리핑 생성 실패 / 목록 로딩 / 받은 보고서 없음 / 오늘 새 브리핑 없음(기존 목록 유지) / API 오류 / 네트워크 오류 (7종) | 첫 사용 상태 통합본 — 첫 사용 3개 상태에서는 내비 카운트·우측 실데이터를 숨김 | Review Needed |
| variants/home-feed-states.html | 홈 — 공개 피드 | 로딩 / 빈 상태 / API 오류 / 네트워크 오류 (4종) | 피드 상태 검수 | Review Needed |
| variants/topic-feed-states.html | 토픽별 브리핑 (신규 화면 제안) | 정상 / 로딩 / 관련 브리핑 없음 / API 오류 / 네트워크 오류 (5종) | 추천 토픽·해시태그 클릭 목적지 제안 (#미국증시 예시) | Pending Decision |
| variants/profile-self-states.html | 본인 프로필 | 콘텐츠 로딩 / 전체 로딩 / 공개 브리핑 없음 / 콘텐츠 오류 / 프로필 오류 / 네트워크 오류 (6종) | 프로필/콘텐츠 로딩·오류 구분 | Review Needed |
| variants/wiki-states.html | 관심사 관리 (LLM Wiki) | 로딩 / 빈(관심사 없음) / API 오류 / 네트워크 오류 (4종) | Wiki 상태 검수 | Review Needed |
| variants/notifications-routing-states.html | 알림 | 이동 가능(읽음/읽지 않음) / 안내 전용 / 대상 삭제됨 / 키보드 접근 | 알림 클릭 라우팅 규칙 표현 (`docs/알림_목적지_라우팅.md` 연동) | Review Needed |
| variants/onboarding-done.html | 온보딩 | 첫 브리핑 안내 (2/2 고정 뷰) | 온보딩 완료 화면 정적본 | Final |
| variants/report-detail-with-image.html | 콘텐츠 상세 | 복수 이미지 (duo/tri/갤러리) | 이미지 배치 변형 | Final |
| variants/report-detail-image-states.html | 콘텐츠 상세 | 이미지 로딩·실패·출처 없음 + 화면 상태 4종(로딩/에러/권한 없음/분석 중) | 상세 화면 상태 검수 | Final |
| variants/report-card-text.html | 피드 카드 | 텍스트형 카드 단품 | 카드 컴포넌트 참고 (760px) | Final |
| variants/report-card-single-image.html | 피드 카드 | 단일 이미지 카드 단품 | 카드 컴포넌트 참고 (760px) | Final |
| variants/report-card-image-grid.html | 피드 카드 | 이미지 그리드 카드 단품 | 카드 컴포넌트 참고 (760px) | Final |

토픽 연결: 우측 rail 추천 토픽·게시물 해시태그 → `variants/topic-feed-states.html`. 실제 라우트(예: `/topic/:topicName`)는 **프론트 제안 — Pending Decision**이라 variant 안에서 `data-target-type="topic"` + `data-topic` 데이터 속성만 사용한다 (공통 라우터 screen key 미등록).

## 5. Landing (1)

| 파일 경로 | 용도 | 상태 |
|---|---|---|
| landing/landing-desktop.html | 랜딩 데스크톱 **기준본** — 브라우저에서 확인. Canvas/MotionOrb 인터랙션이 실제 HTML에서 동작함 | Final |

- 개발 구현 시 참고 원본: Cowork 작업 폴더 `Outputs/디자인산출물_2026-07-07/alphacatcher-landing-mockup-v2-motionorb.html` (문서 프레임 포함 원본 · Motion Spec은 `LANDING_EXPORT_REPORT.md` 참조 — 저장소 외부 보존)
- 구버전 구분: `alphacatcher-landing-mockup-v1.html`은 구버전 — 기준으로 사용하지 않음 (v1 동결 표기는 폐기된 문구)

## 6. Admin (6)

전부 시각 디자인 미확정 Rough. 어드민은 별도 앱(admin-web) 영역이라 제품 화면 수와 합산하지 않는다.

| 파일 경로 | 화면명 | 구분 | 구현 우선순위 |
|---|---|---|---|
| admin/admin-users-rough.html | 사용자 관리 | **개발 참고 가능** (최소본 구현 기준 — DECISION-034) | 우선 |
| admin/admin-403-rough.html | 권한 없음 403 | **개발 참고 가능** (최소본 구현 기준) | 우선 |
| admin/admin-overview-rough.html | 개요 | Rough · 시각 디자인 미확정 | 이후 확장 |
| admin/admin-pipeline-rough.html | 수집 파이프라인 | Rough · 시각 디자인 미확정 | 이후 확장 |
| admin/admin-sources-rough.html | RSS 소스 관리 | Rough · 시각 디자인 미확정 | 이후 확장 |
| admin/admin-llm-rough.html | LLM · 프롬프트 | Rough · 시각 디자인 미확정 | 이후 확장 |

## 7. 디자인 시스템 · 공통 자산

| 파일 경로 | 용도 |
|---|---|
| foundations/foundations.html | 컬러·타이포 파운데이션 시트 |
| components/ui-kit.html | 컴포넌트 인벤토리 |
| shared/tokens.css | 디자인 토큰 (Light/Dark) — 모든 목업·구현의 색 기준 |
| shared/base.css | 공통 레이아웃 (+ 상태 전환 시 스크롤바 폭 보정, 2026-07-16) |
| shared/product-components.css | 제품 컴포넌트 스타일 |
| shared/product-common.js | 목업 공통 인터랙션·파일 간 라우팅 |

## 8. 제외·Archive 파일

아래는 **HTML 기준본이 아니라서** 현재 목록에서 제외한다.

| 구분 | 경로 | 이유 |
|---|---|---|
| Prototype | prototype/auth-google-redirect.html | 정적 목업의 OAuth 분기 **검수 전용**. 실제 구현은 외부 Google OAuth 화면으로 직행 — 화면 수 집계·리뷰 대상에서 제외 |
| Archive | Cowork 작업 폴더 `Outputs/디자인산출물_2026-07-07/` 원본 목업 13건 | 원본 통합 목업(v2)·구버전 와이어프레임·v1 화면별 구버전·과거 인덱스 페이지 — 이력 확인용 원본 (저장소 외부 보존) |

## 9. 집계

라우트 수 · HTML 파일 수 · 상태 수는 서로 다른 개념이므로 분리해 기록한다.
(예: 홈 내 보고서 = 화면 1개 · 상태 7종 · 상태 검수용 HTML 1개)

| 항목 | 수 | 비고 |
|---|---|---|
| 기본 제품 HTML | **15** | §3 |
| 상태 variant HTML | **12** | §4 (기존 6 + 2026-07-16 신규 6) |
| Landing HTML | **1** | §5 |
| Admin HTML | **6** | §6 (개발 참고 2 + Rough 4) |
| Prototype | **1** | 집계·리뷰 제외 |
| Archive | **13** | Outputs 원본 (저장소 외부) |
| 실제 제품 라우트 수 | **12** | `docs/화면설계_페이지구성.md` §2 유저 12화면 기준 — 토픽 화면 채택 시 +1 (Pending Decision) |
| variant가 다루는 상태 수 | **약 40종** | 파일당 4~7종 — 화면 수로 계산하지 않음 |
| Pending Decision 항목 | **6** | `docs/미정사항_팀확인요청.md` §A~F |

## 10. Pending Decision

상세 질문·임시 처리안은 **`docs/미정사항_팀확인요청.md`** 참조.

- 관심사 최소 1개 필수 여부 (§D — UX 기준안)
- 온보딩 "나중에 할게요" 제거 여부 (§D)
- 토픽 화면의 MVP 포함 여부·최종 라우트 (§F)
- 비밀번호 재설정 방식 (§A)
- 가입 시 이메일 인증 여부 (§B)
- 관심 자료 분석 완료 흐름 (§C)
- 로그아웃 및 세션 만료 처리 (§E)
- 알림 라우팅·읽음 처리 시점 (`docs/알림_목적지_라우팅.md`)

## 11. 다음 액션

1. 신규·수정된 HTML을 브라우저에서 육안 검수 (상단 목업 전용 컨트롤로 상태 전환)
2. 라이트·다크 모드 확인
3. 상태 전환 버튼 정상 동작 확인 (전환 시 좌우 흔들림 없음 — base.css 보정 적용)
4. 상대 CSS·JS 경로 확인 (로컬 서버 권장)
5. 변경 파일 Git commit
6. Pull Request에 검수 대상 HTML 경로 정리
7. Pending Decision을 팀 회의에서 확정 (`docs/미정사항_팀확인요청.md`, `docs/결정회의_안건지.md` 연동)
8. 확정 후 실제 프론트 구현 문서(`bambi-service-web/CLAUDE.md` 등)에 반영

---

## 변경 이력

- **2026-07-16** — 팀 합의에 따라 기존 Figma MCP 이관 계획을 중단하고 **Git 기반 HTML 목업 공유 방식으로 전환**. `FIGMA_HANDOFF_INDEX.md`(2026-07-14, Figma Page/Frame/배치 계획)를 본 문서로 전면 개정. Figma 관련 계획(Page·Section·Frame 구성, MCP 호출 배치, Native/Static 구분)은 현재 기준으로 사용하지 않음.
- **2026-07-16** — 상태 목업 정리: 첫 사용 상태를 `variants/home-my-reports-states.html`에 통합, 중복 파일(`home-first-use-states.html`) 삭제. 홈 피드의 근거 없는 필터 상태 제거. 토픽 화면(`topic-feed-states.html`) 신규 제안. 상태 전환 시 레이아웃 흔들림 보정(base.css)·토픽 헤더 평면화 반영.
- **2026-07-14** — (구 인덱스 기록) home-feed 게스트 시안 블록 해소, 랜딩 기준본을 최신 MotionOrb 버전으로 확정(`landing/landing-desktop.html` 생성), Review Needed 0건 처리.
