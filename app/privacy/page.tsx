import type { Metadata } from "next";
import Link from "next/link";

import { BrandHeader } from "@/components/ui/brand-header";

const EFFECTIVE_DATE = "2026년 8월 11일";
// [⚠️ LEGAL REVIEW REQUIRED] 실제 수신 가능한 주소인지 확인하고 운영 주체의 법정 상호·주소를 확정한다.
const PRIVACY_CONTACT_EMAIL = "privacy@elixirevo.com";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — AlphaCatcher 밤새비서",
  description:
    "AlphaCatcher 밤새비서 웹 서비스와 밤새비서 클리퍼의 개인정보 수집·이용·보관·제공 방침입니다.",
};

const tableClassName =
  "w-full min-w-[680px] border-collapse text-left text-[13.5px] leading-[1.75]";
const headerCellClassName =
  "border-b border-border bg-background px-4 py-3 font-semibold text-foreground";
const cellClassName = "border-b border-border px-4 py-3 align-top text-ink-mid";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BrandHeader />

      <main className="mx-auto w-full max-w-[1120px] px-5 py-12 sm:px-8 sm:py-16">
        <header className="max-w-[820px]">
          <p className="mb-3 text-[12px] font-semibold tracking-[0.12em] text-signal-ink uppercase">
            Privacy Policy
          </p>
          <h1 className="text-[32px] leading-[1.25] font-bold tracking-[-0.025em] sm:text-[40px]">
            개인정보 처리방침
          </h1>
          <p className="mt-5 text-[15px] leading-[1.8] text-ink-mid sm:text-base">
            AlphaCatcher 운영팀(이하 &quot;운영팀&quot;)은 밤새비서 웹 서비스와 Chrome 확장
            프로그램 &quot;밤새비서 클리퍼&quot;(이하 통칭하여 &quot;서비스&quot;)를 제공하면서
            이용자의 개인정보를 필요한 범위에서만 처리합니다. 이 방침은 어떤 정보를 왜 수집하고,
            어디에 사용하며, 어떻게 보호하는지 설명합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            <span>시행일: {EFFECTIVE_DATE}</span>
            <span>최종 변경일: {EFFECTIVE_DATE}</span>
          </div>
        </header>

        <section
          aria-labelledby="privacy-summary-title"
          className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow)] sm:p-8"
        >
          <h2 id="privacy-summary-title" className="text-lg font-bold">
            핵심 요약
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SummaryCard
              title="수집하는 정보"
              description="계정 정보, 저장한 웹페이지의 URL·제목·본문 또는 YouTube 자막, 관심사, 서비스 이용 기록을 처리합니다."
            />
            <SummaryCard
              title="사용 목적"
              description="로그인, 자료 저장, AI 요약·분류·개인 Wiki·브리핑 생성, 커뮤니티 기능과 보안 운영에만 사용합니다."
            />
            <SummaryCard
              title="판매·광고 금지"
              description="개인정보나 웹 탐색 정보를 판매하지 않으며, 맞춤형·리타기팅 광고에 사용하거나 광고업체에 제공하지 않습니다."
            />
            <SummaryCard
              title="이용자의 선택권"
              description="자신의 정보를 열람·정정·삭제하거나 처리 정지를 요청할 수 있고, 클리퍼는 아이콘을 누른 페이지에만 접근합니다."
            />
          </div>
        </section>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="개인정보 처리방침 목차"
            className="rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6"
          >
            <p className="mb-3 text-[12px] font-semibold text-muted-foreground">목차</p>
            <ol className="space-y-2 text-[13px] leading-[1.55] text-ink-mid">
              <TocItem href="#purpose">1. 처리 목적</TocItem>
              <TocItem href="#collection">2. 수집 항목과 방법</TocItem>
              <TocItem href="#clipper">3. 클리퍼 데이터 처리</TocItem>
              <TocItem href="#retention">4. 보유 및 파기</TocItem>
              <TocItem href="#sharing">5. 제3자 제공·공개</TocItem>
              <TocItem href="#processors">6. 처리위탁·국외 처리</TocItem>
              <TocItem href="#ai">7. AI 처리</TocItem>
              <TocItem href="#rights">8. 이용자의 권리</TocItem>
              <TocItem href="#security">9. 안전성 확보조치</TocItem>
              <TocItem href="#local-storage">10. 로컬 저장·추적 기술</TocItem>
              <TocItem href="#children">11. 아동의 개인정보</TocItem>
              <TocItem href="#contact">12. 문의 및 권리구제</TocItem>
              <TocItem href="#changes">13. 방침 변경</TocItem>
            </ol>
          </nav>

          <article className="min-w-0 rounded-2xl border border-border bg-card px-5 py-2 shadow-[var(--shadow)] sm:px-9">
            <PolicySection id="purpose" number="1" title="개인정보의 처리 목적">
              <p>운영팀은 다음 목적에 필요한 범위에서 개인정보를 처리합니다.</p>
              <PolicyList>
                <li>회원가입, 로그인, 본인 식별, 계정 및 인증 상태 관리</li>
                <li>이용자가 선택한 웹페이지·영상 자막의 저장, 중복 확인 및 목록 제공</li>
                <li>저장 자료의 요약·분류·임베딩, 관심사 추론, 개인 Wiki와 브리핑 생성</li>
                <li>프로필, 공개 카드, 댓글, 좋아요, 스크랩, 팔로우 및 알림 기능 제공</li>
                <li>이용자 설정, MCP API 키 및 OAuth 연결 관리</li>
                <li>오류 분석, 부정 이용 방지, 보안 사고 대응 및 서비스 품질 유지</li>
                <li>법령상 의무 이행 및 이용자 문의·분쟁 대응</li>
              </PolicyList>
              <p>수집한 정보는 위 목적과 합리적으로 관련된 범위를 넘어 이용하지 않습니다.</p>
            </PolicySection>

            <PolicySection id="collection" number="2" title="수집하는 개인정보의 항목과 수집 방법">
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className={tableClassName}>
                  <thead>
                    <tr>
                      <th className={headerCellClassName}>구분</th>
                      <th className={headerCellClassName}>처리 항목</th>
                      <th className={headerCellClassName}>수집 방법</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={cellClassName}>계정·프로필</td>
                      <td className={cellClassName}>
                        이메일, 표시 이름, 사용자명, 소개, 비밀번호의 일방향 암호화 값, 가입·수정 시각
                      </td>
                      <td className={cellClassName}>회원가입 및 프로필 입력</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>저장 자료</td>
                      <td className={cellClassName}>
                        이용자가 저장한 웹페이지의 URL, 제목, 본문 텍스트 또는 YouTube 자막, 저장 시각,
                        요약과 분류 결과
                      </td>
                      <td className={cellClassName}>웹 입력 또는 클리퍼 아이콘 클릭</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>관심사·AI 파생 정보</td>
                      <td className={cellClassName}>
                        직접 선택한 관심사와 브리핑 주제, 저장 자료에서 추론한 관심사, 근거, 개인 Wiki의
                        개체·관계·문서·벡터, 생성된 보고서·카드와 인용 출처
                      </td>
                      <td className={cellClassName}>이용자 입력 및 서비스의 AI 처리</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>서비스 활동</td>
                      <td className={cellClassName}>
                        카드 공개 범위, 댓글, 좋아요, 스크랩, 팔로우, 알림과 읽음 상태, 기능 설정,
                        생성 요청·처리 상태
                      </td>
                      <td className={cellClassName}>서비스 기능 이용 과정</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>연동·인증</td>
                      <td className={cellClassName}>
                        액세스 토큰, MCP API 키의 이름·접두부·해시·권한·만료·최근 사용 시각, OAuth
                        클라이언트·승인 범위·리디렉션 주소·토큰 해시
                      </td>
                      <td className={cellClassName}>로그인, API 키 발급 및 OAuth 연결</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>자동 생성 정보</td>
                      <td className={cellClassName}>
                        IP 주소, 브라우저·기기 정보(User-Agent), 요청 시각·경로, 오류 및 보안 로그
                      </td>
                      <td className={cellClassName}>웹 서버와 API 이용 과정에서 자동 생성</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                서비스는 주민등록번호, 결제정보, 정밀 위치정보, 건강정보를 기능상 요구하지 않습니다.
                이용자는 저장하려는 페이지에 민감한 개인정보나 제3자의 비공개 정보가 포함되어 있지 않은지
                확인해야 합니다.
              </p>
            </PolicySection>

            <PolicySection id="clipper" number="3" title="밤새비서 클리퍼의 웹 데이터 처리">
              <div className="rounded-xl border border-primary/25 bg-[var(--wash)] p-5">
                <p className="font-semibold text-foreground">클리퍼는 사용자가 명시적으로 누른 순간에만 작동합니다.</p>
                <p className="mt-2">
                  툴바의 🌙 아이콘을 클릭하면 현재 활성 탭의 URL, 제목과 본문 텍스트를 읽습니다.
                  YouTube 영상에서는 페이지 전체 대신 사용 가능한 자막을 읽습니다. 이 정보는 이용자의
                  밤새비서 계정에 저장하기 위해 HTTPS로 서비스 서버에 전송됩니다.
                </p>
              </div>
              <PolicyList>
                <li>아이콘을 누르지 않은 탭이나 과거 방문 기록을 백그라운드에서 수집하지 않습니다.</li>
                <li>페이지의 비밀번호, 쿠키, 입력 폼 값을 별도로 읽거나 수집하도록 설계하지 않았습니다.</li>
                <li>웹페이지 내용은 자료 저장 및 관련 AI 기능 제공에 필요한 범위에서만 사용합니다.</li>
                <li>인증 토큰과 서버 주소는 이용자의 브라우저 내 Chrome 로컬 저장소에 보관합니다.</li>
              </PolicyList>
              <p className="font-medium text-foreground">
                밤새비서 클리퍼에서 받은 정보의 이용은 Chrome 웹 스토어 사용자 데이터 정책과 Limited
                Use(제한적 사용) 요구사항을 준수합니다. 해당 정보를 맞춤형 광고, 신용평가 또는 데이터
                판매에 사용하지 않으며, 서비스 기능 제공에 필요한 경우 외에는 이전하지 않습니다.
              </p>
            </PolicySection>

            {/* [⚠️ LEGAL REVIEW REQUIRED] 실제 로그·백업 보존주기 및 법정 보존항목과 일치하는지 확정한다. */}
            <PolicySection id="retention" number="4" title="개인정보의 처리 및 보유 기간과 파기">
              <p>
                운영팀은 개인정보 처리 목적에 필요한 기간 동안만 정보를 보유합니다. 관계 법령이 별도
                보존기간을 정한 경우에는 해당 기간 동안 분리하여 보관할 수 있습니다.
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className={tableClassName}>
                  <thead>
                    <tr>
                      <th className={headerCellClassName}>정보</th>
                      <th className={headerCellClassName}>보유 기준</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={cellClassName}>계정·프로필</td>
                      <td className={cellClassName}>회원 탈퇴 또는 계정 삭제 요청 처리 완료 시까지</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>저장 자료·개인 Wiki·AI 결과</td>
                      <td className={cellClassName}>
                        이용자가 해당 자료를 삭제하거나 개인 Wiki를 초기화하거나 계정을 삭제할 때까지
                      </td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>댓글·좋아요·스크랩·팔로우</td>
                      <td className={cellClassName}>이용자가 직접 삭제·취소하거나 계정을 삭제할 때까지</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>브라우저 인증 토큰</td>
                      <td className={cellClassName}>
                        로그아웃 또는 브라우저 저장소 삭제 시 제거되며, 서버 인증 효력은 발급 후 최대 120분
                      </td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>OAuth·API 키 정보</td>
                      <td className={cellClassName}>만료, 철회 또는 이용자의 연결·키 삭제 시까지</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>접속·오류·보안 기록</td>
                      <td className={cellClassName}>
                        장애 대응과 보안 목적 달성에 필요한 최소 기간 또는 관계 법령이 요구하는 기간
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                파기할 때에는 데이터베이스 레코드를 삭제하거나 복구할 수 없는 방식으로 덮어쓰며, 종이
                문서가 있는 경우 분쇄 또는 소각합니다. 백업에 남은 정보는 백업 보존주기에 따라 접근을
                제한한 상태에서 순차적으로 삭제합니다.
              </p>
            </PolicySection>

            <PolicySection id="sharing" number="5" title="개인정보의 제3자 제공과 공개 범위">
              <p>
                운영팀은 개인정보를 판매하지 않으며, 원칙적으로 이용자의 개인정보를 외부에 제공하지
                않습니다. 다만 다음 경우에는 필요한 범위에서 제공할 수 있습니다.
              </p>
              <PolicyList>
                <li>이용자가 사전에 특정 제공에 동의한 경우</li>
                <li>법령에 근거가 있거나 수사기관 등 적법한 권한을 가진 기관의 요구가 있는 경우</li>
                <li>생명·신체에 급박한 위험이 있고 동의를 받을 수 없는 경우</li>
                <li>서비스의 합병·영업양도 시 사전 고지와 관계 법령상 절차를 거친 경우</li>
              </PolicyList>
              <p>
                이용자가 카드를 <strong className="text-foreground">공개</strong>로 설정하면 카드·보고서,
                표시 이름, 사용자명, 프로필 소개와 공개 활동이 다른 이용자나 비회원에게 보일 수 있습니다.
                공개 카드에 작성한 댓글 및 팔로우 관계도 서비스 화면에 표시될 수 있습니다. 기본 카드 공개
                범위는 비공개이며, 이용자가 설정에서 변경할 수 있습니다.
              </p>
            </PolicySection>

            {/* [⚠️ LEGAL REVIEW REQUIRED] 수탁자 계약, 처리 국가·일시·방법·보유기간 및 이전 근거를 확정한다. */}
            <PolicySection id="processors" number="6" title="개인정보 처리위탁 및 국외 처리 가능성">
              <p>
                서비스 제공을 위해 아래 업체의 인프라와 API를 사용할 수 있습니다. 이 과정에서 서비스
                데이터가 업체의 국외 처리시설에서 일시적으로 처리될 수 있습니다. 운영팀은 계약과 설정을
                통해 목적 외 이용을 제한하고 필요한 보호조치를 적용합니다.
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className={tableClassName}>
                  <thead>
                    <tr>
                      <th className={headerCellClassName}>수탁자·서비스</th>
                      <th className={headerCellClassName}>처리 목적</th>
                      <th className={headerCellClassName}>처리될 수 있는 정보</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={cellClassName}>Google Cloud Platform</td>
                      <td className={cellClassName}>서버·데이터베이스 인프라 운영</td>
                      <td className={cellClassName}>서비스에 저장되는 계정·콘텐츠·이용 정보</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>OpenAI API</td>
                      <td className={cellClassName}>요약, 분류, 관심사·Wiki·보고서 생성 및 임베딩</td>
                      <td className={cellClassName}>저장한 본문, 관심사, 처리 지시와 생성 결과</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>Jina AI / Elastic</td>
                      <td className={cellClassName}>이용자가 저장한 URL의 공개 웹 콘텐츠 추출</td>
                      <td className={cellClassName}>저장한 URL과 해당 공개 페이지의 내용</td>
                    </tr>
                    <tr>
                      <td className={cellClassName}>Google Fonts·jsDelivr</td>
                      <td className={cellClassName}>웹 폰트와 정적 파일 전송</td>
                      <td className={cellClassName}>IP 주소, User-Agent, 요청 시각 등 HTTP 요청 정보</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                AI 또는 콘텐츠 추출 처리를 원하지 않는 이용자는 클리퍼로 페이지를 저장하지 않거나 이미
                저장한 자료를 삭제할 수 있습니다. 국외 처리의 구체적인 국가·보유기간·재위탁 현황은 각
                업체의 계약 및 개인정보 보호 문서에 따르며, 중요한 변경이 생기면 이 방침을 갱신합니다.
              </p>
            </PolicySection>

            <PolicySection id="ai" number="7" title="AI를 이용한 개인정보 처리">
              <PolicyList>
                <li>
                  저장 자료는 요약, 주제 분류, 개인 Wiki 구성, 관련 뉴스 탐색 및 브리핑 생성을 위해 AI
                  모델에 입력될 수 있습니다.
                </li>
                <li>
                  AI가 추론한 관심사와 생성 결과는 부정확할 수 있으며, 이용자에게 법적 또는 이에 준하는
                  중대한 효과를 주는 자동 의사결정에 사용하지 않습니다.
                </li>
                <li>
                  운영 인력이 이용자 콘텐츠를 임의로 열람하지 않습니다. 이용자가 특정 문의 해결을 위해
                  명시적으로 동의한 경우, 보안 사고 조사, 법적 의무 이행 또는 적법하게 익명화·집계한 내부
                  운영 분석에 필요한 경우에만 제한적으로 접근할 수 있습니다.
                </li>
                <li>
                  OpenAI API로 전송되는 입력과 출력은 운영팀이 별도로 데이터 공유에 동의하지 않는 한 모델
                  학습에 사용되지 않는 사업자용 API 정책을 적용받습니다.
                </li>
              </PolicyList>
            </PolicySection>

            <PolicySection id="rights" number="8" title="이용자와 법정대리인의 권리 및 행사 방법">
              <p>이용자는 언제든 다음 권리를 행사할 수 있습니다.</p>
              <PolicyList>
                <li>자신의 개인정보 및 처리 내역에 대한 열람·사본 요청</li>
                <li>부정확한 계정·프로필 정보의 정정</li>
                <li>저장 자료, 댓글, 관심사, 연동 정보 및 계정의 삭제 요청</li>
                <li>특정 개인정보 처리의 정지 또는 동의 철회 요청</li>
                <li>개인정보 처리에 대한 이의 제기 및 설명 요청</li>
              </PolicyList>
              <p>
                서비스 내 편집·삭제·초기화 기능을 사용하거나 아래 개인정보 문의처로 요청할 수 있습니다.
                운영팀은 요청자의 본인 여부를 확인한 뒤 관계 법령이 정한 기간 내에 처리합니다. 법정대리인이나
                위임받은 사람도 적법한 위임 관계를 확인할 수 있는 자료를 제출하여 권리를 행사할 수 있습니다.
              </p>
            </PolicySection>

            <PolicySection id="security" number="9" title="개인정보의 안전성 확보조치">
              <PolicyList>
                <li>서비스와 클리퍼의 개인정보 전송 구간에 HTTPS 암호화 적용</li>
                <li>비밀번호의 BCrypt 일방향 해시 저장 및 인증 토큰·API 키 원문 저장 최소화</li>
                <li>JWT 기반 인증, 사용자별 접근 범위 확인 및 관리자 권한 분리</li>
                <li>공개·비공개 데이터 구분과 기본 비공개 설정</li>
                <li>접속 제한, 요청 속도 제한, 보안 헤더 및 오류·감사 기록 관리</li>
                <li>개인정보 취급 인원 최소화와 보안 사고 대응 절차 운영</li>
              </PolicyList>
              <p>
                다만 인터넷을 통한 전송과 저장의 특성상 절대적인 안전을 보장할 수는 없습니다. 침해 사고가
                발생하면 관계 법령에 따라 이용자와 관계기관에 알리고 피해를 줄이기 위한 조치를 시행합니다.
              </p>
            </PolicySection>

            <PolicySection id="local-storage" number="10" title="브라우저 로컬 저장소, 쿠키 및 추적 기술">
              <PolicyList>
                <li>
                  웹 서비스는 로그인 액세스 토큰과 화면 테마 설정을 브라우저의 localStorage에 저장합니다.
                </li>
                <li>
                  밤새비서 클리퍼는 로그인 액세스 토큰과 서버 주소를 Chrome의 로컬 확장 저장소에 저장합니다.
                </li>
                <li>
                  현재 맞춤형 광고, 행동 추적 또는 마케팅 분석을 위한 쿠키와 추적 픽셀을 사용하지 않습니다.
                </li>
              </PolicyList>
              <p>
                이용자는 로그아웃하거나 브라우저·확장 프로그램 저장소를 삭제하여 로컬 정보를 제거할 수
                있습니다. 로컬 저장을 차단하거나 삭제하면 로그인 상태와 테마 설정이 유지되지 않을 수 있습니다.
              </p>
            </PolicySection>

            <PolicySection id="children" number="11" title="만 14세 미만 아동의 개인정보">
              <p>
                서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 고의로 수집하지
                않습니다. 만 14세 미만 아동의 정보가 법정대리인의 동의 없이 수집된 사실을 알게 된 경우
                확인 후 지체 없이 삭제합니다. 관련 사실은 아래 문의처로 알려주시기 바랍니다.
              </p>
            </PolicySection>

            <PolicySection id="contact" number="12" title="개인정보 보호 문의 및 권리구제">
              <div className="rounded-xl border border-border bg-background p-5">
                <dl className="grid gap-3 text-[14px] sm:grid-cols-[160px_1fr]">
                  <dt className="font-semibold text-foreground">개인정보 보호 담당</dt>
                  <dd className="text-ink-mid">AlphaCatcher 운영팀</dd>
                  <dt className="font-semibold text-foreground">이메일</dt>
                  <dd>
                    <a
                      href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                      className="font-medium text-signal-ink underline underline-offset-2"
                    >
                      {PRIVACY_CONTACT_EMAIL}
                    </a>
                  </dd>
                </dl>
              </div>
              <p>
                개인정보 침해에 대한 상담이나 분쟁조정이 필요한 경우 개인정보침해신고센터(국번 없이 118,
                privacy.kisa.or.kr) 또는 개인정보분쟁조정위원회(1833-6972, kopico.go.kr)에 문의할 수
                있습니다.
              </p>
            </PolicySection>

            <PolicySection id="changes" number="13" title="개인정보 처리방침의 변경">
              <p>
                법령, 서비스 기능 또는 데이터 처리 방식이 바뀌면 이 방침을 변경할 수 있습니다. 중요한
                변경이 있는 경우 시행 전에 서비스 화면이나 이메일 등 합리적인 방법으로 알립니다. 변경된
                방침에는 시행일과 최종 변경일을 표시하며, 이전 방침은 요청 시 확인할 수 있도록 관리합니다.
              </p>
            </PolicySection>
          </article>
        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 px-5 py-7 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© 2026 AlphaCatcher</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground">
              서비스 홈
            </Link>
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="hover:text-foreground">
              개인정보 문의
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SummaryCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-[13px] leading-[1.7] text-ink-mid">{description}</p>
    </div>
  );
}

function TocItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="block rounded-md px-2 py-1 hover:bg-background hover:text-foreground">
        {children}
      </a>
    </li>
  );
}

function PolicySection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-b border-border py-9 last:border-b-0">
      <h2 className="text-xl leading-[1.4] font-bold tracking-[-0.015em]">
        <span className="mr-2 text-signal-ink">{number}.</span>
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-[14px] leading-[1.85] text-ink-mid sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function PolicyList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-signal-ink">{children}</ul>;
}
