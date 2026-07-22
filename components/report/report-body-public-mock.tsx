/**
 * 공개 브리핑 본문 mock — 목업 variants/report-detail-guest.html .md 블록.
 * report-body-mock.tsx(작성자 "나만 보기" 본문)의 공개 버전: 개인 관점 문구("회원님의"·
 * "왜 지금 중요한가" 개인 해석)를 공개 작성자 관점으로 바꾸고, 개인화 피드백(.tfb "이 주제 더 보기")은 제거.
 *
 * ★ 실제 API 교체 지점: 본문 전체가 마크다운 렌더러 호출로 대체된다(lib/mock/report.ts 상단 주석).
 * private/public 본문 모두 그때 삭제된다.
 */
export function ReportBodyPublicMock() {
  return (
    <div className="md-viewer">
      <h2>핵심 요약</h2>
      <p>
        밤사이 달러화는 주요 통화 대비 전반적으로 약세를 보였습니다. 오늘 밤 발표되는 미
        소비자물가지수(<b>CPI</b>)가 시장 예상치를 하회할 것이라는 기대가 채권 시장에서 먼저
        가격에 반영되기 시작했고, 이 흐름이 외환 시장으로 이어졌습니다.
      </p>

      <ul>
        <li>
          원/달러 환율은 새벽 3시 이후 낙폭을 키우며 전일 종가 대비 <b>0.8% 하락</b>했습니다.
        </li>
        <li>
          채권 금리 동반 하락 — 시장은 오늘 밤 CPI를 낮게 반영하기 시작했습니다.
          <ul>
            <li>
              미 10년물 <b>−6bp</b>, 2년물 −4bp (새벽 3시 기준)
            </li>
            <li>금리·환율이 같은 방향 — 출처 [1][2]</li>
          </ul>
        </li>
        <li>환전을 앞두고 있다면 확인할 만한 변동입니다.</li>
      </ul>

      <blockquote>
        “달러 약세는 원화만의 움직임이 아니라 달러 인덱스 전반의 하락과 동조하고 있다.”
        <span className="qs">
          — <a className="ext" aria-disabled="true">한국은행 외환시장 동향 공시</a> 인용
        </span>
      </blockquote>

      <h2>통화별 야간 변동</h2>
      <table>
        <thead>
          <tr>
            <th>통화</th>
            <th>야간 변동</th>
            <th>방향</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>USD/KRW</td>
            <td><span className="dn">−0.8%</span></td>
            <td>하락</td>
          </tr>
          <tr>
            <td>USD/JPY</td>
            <td><span className="dn">−0.5%</span></td>
            <td>하락</td>
          </tr>
          <tr>
            <td>달러 인덱스(DXY)</td>
            <td><span className="dn">−0.4%</span></td>
            <td>하락</td>
          </tr>
          <tr>
            <td>EUR/USD</td>
            <td><span className="up">+0.3%</span></td>
            <td>유로 강세</td>
          </tr>
        </tbody>
      </table>
      <p className="tnote">표는 오전 5:10 기준 · 출처 [1] 한국은행, [2] 주요 경제지</p>

      {/* ![ ] image — 이미지 + 캡션/출처/라이선스 (.fig) */}
      <figure className="my-2 mb-5">
        <div className="relative w-full overflow-hidden rounded-xl border border-border bg-[var(--img)]">
          <span className="relative block h-[300px]">
            <svg
              className="block h-full w-full"
              viewBox="0 0 596 300"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="596" height="300" style={{ fill: "var(--background)" }} />
              <g style={{ stroke: "var(--border)" }} strokeWidth={1}>
                <line x1="0" y1="75" x2="596" y2="75" />
                <line x1="0" y1="150" x2="596" y2="150" />
                <line x1="0" y1="225" x2="596" y2="225" />
              </g>
              <polyline
                style={{ fill: "none", stroke: "var(--primary)" }}
                strokeWidth={3}
                points="24,112 108,120 192,108 276,142 360,158 444,184 528,202 572,224"
              />
              <circle cx="276" cy="142" r="4.5" style={{ fill: "var(--primary)" }} />
              <text x="24" y="34" style={{ fill: "var(--muted-foreground)" }} fontFamily="Pretendard Variable,Pretendard,Apple SD Gothic Neo,sans-serif" fontSize={14}>
                USD/KRW · 24h
              </text>
              <text x="292" y="132" style={{ fill: "var(--ink-mid)" }} fontFamily="Pretendard Variable,Pretendard,Apple SD Gothic Neo,sans-serif" fontSize={12} fontWeight={600}>
                03:00 낙폭 확대
              </text>
              <text x="520" y="252" style={{ fill: "var(--ink-mid)" }} fontFamily="Pretendard Variable,Pretendard,Apple SD Gothic Neo,sans-serif" fontSize={14} fontWeight={600}>
                −0.8%
              </text>
            </svg>
          </span>
        </div>
        <figcaption className="mt-[9px] flex items-baseline gap-[9px] text-xs leading-[1.5] text-muted-foreground">
          <span className="flex-1">그림 1. 원/달러 환율 24시간 흐름 — 새벽 3시 이후 낙폭 확대</span>
          <span className="whitespace-nowrap text-ink-mid">출처 · 한국은행</span>
          <span className="rounded-[5px] border border-border px-[7px] py-0.5 text-[11px] whitespace-nowrap text-muted-foreground">
            재사용 허용 (공시자료)
          </span>
        </figcaption>
      </figure>

      <h2>왜 지금 중요한가</h2>
      <p>
        환전 예정이 있다면 목표 환율 대비 현재 위치를 점검해 볼 시점입니다. 다만 오늘 밤 CPI 수치가
        예상을 웃돌 경우 <b>단기 반등 변수</b>가 있어, 이후 흐름은 달라질 수 있습니다.
      </p>

      <h3>제가 적용한 트리거 조건</h3>
      <div className="code">
        <span className="cm">{"// LLM Wiki에서 수정 가능"}</span>
        <br />
        {"{"}
        <br />
        &nbsp;&nbsp;<span className="k">&quot;interest&quot;</span>: &quot;USD/KRW&quot;,
        <br />
        &nbsp;&nbsp;<span className="k">&quot;trigger&quot;</span>: {"{ "}
        <span className="k">&quot;type&quot;</span>: &quot;daily_change&quot;,{" "}
        <span className="k">&quot;threshold&quot;</span>: 0.5 {"}"},
        <br />
        &nbsp;&nbsp;<span className="k">&quot;actual&quot;</span>: -0.8,&nbsp;&nbsp;
        <span className="cm">{"// 조건 충족 → 오늘 1순위"}</span>
        <br />
        &nbsp;&nbsp;<span className="k">&quot;d_day&quot;</span>: 14&nbsp;&nbsp;
        <span className="cm">{"// 환전 예정일까지"}</span>
        <br />
        {"}"}
      </div>
      <p>
        임계값 <code>threshold: 0.5</code> 같은 조건은 로그인 후 LLM Wiki에서 직접 설정할 수 있어요.
      </p>

      <h3>오늘 확인해볼 것</h3>
      <ol>
        <li>
          오늘 밤 <b>21:30</b> 미 CPI 발표 — 예상 상회 시 단기 반등 가능
        </li>
        <li>분할 환전 시 1차 실행 구간 검토 (목표 환율 대비 현재 위치)</li>
        <li>내일 아침 브리핑에서 발표 결과와 환율 반응 후속 확인</li>
      </ol>
    </div>
  );
}
