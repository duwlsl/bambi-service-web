import type { ReactNode } from "react";

/**
 * 리포트 본문(Markdown) 안전 렌더러 — 외부 의존성 없이 agent 생성 본문의 실측 부분집합만 다룬다.
 * (계약: bambi-agent-api report_builder_system.md — Markdown 본문 + [P1]·[G1]·[L1] 인용 참조)
 *
 * - React 요소로만 조립한다(dangerouslySetInnerHTML 미사용) → 본문에 HTML 태그가 섞여 있어도
 *   문자 그대로 표시될 뿐 실행되지 않는다(무검증 raw HTML 렌더 금지 원칙).
 * - 블록: 제목(#·## → h2, ### 이상 → h3) · 문단 · 목록(-·* 1단계 중첩, "1." 순서 목록) ·
 *   인용(>) · 표(|…|) · 코드 펜스(```). 수평선(---)은 대응 스타일이 없어 구분 없이 건너뛴다.
 * - 인라인: **굵게** · `코드` · [텍스트](http/https URL) 링크만. [P1] 같은 인용 참조는 뒤에
 *   (URL) 이 없어 링크로 해석되지 않고 본문 텍스트로 남는다(계약 표기 유지).
 *   http/https 외 스킴은 링크로 만들지 않는다(원문 텍스트 유지).
 * - 지원 밖 문법은 변형 없이 원문 텍스트로 노출된다(내용 유실 없음).
 * - 스타일은 기존 .md-viewer(globals.css) 컨테이너 스코프를 그대로 쓴다(목업 1:1).
 *
 * ## delta 모드 (변경점 폼 본문)
 *
 * **`body` 는 서버가 완성한 Markdown 원문이다. 프론트는 내용을 만지지 않는다** (확정 계약).
 * 문장·목록·헤더를 재조합하지 않고, 요약·정렬·문구 보정도 하지 않으며, 본문 헤더를 읽어
 * 폼(단일 주제 / 다주제)이나 섹션 역할을 추측하지도 않는다. 델타 생성이 실패하면 서버가
 * 일반 본문과 `changeHistoryEnabled: false` 를 함께 내려주므로 프론트 폴백도 두지 않는다.
 *
 * 그래서 **블록 파싱은 delta 와 완전히 무관하다** — 같은 `body` 는 delta 여부와 상관없이 같은
 * 구조(문단·목록·헤더 순서·깊이)로 파싱된다. `delta` 가 바꾸는 것은 두 가지뿐이다:
 *   1. 컨테이너에 `.md-delta` variant 클래스를 붙인다 → 이후는 **렌더된 요소에 대한 CSS 스타일링**
 *      (globals.css) 몫이다. 취소선·인라인 코드·강조를 델타 표현으로 읽히게 하는 것도 전부 거기서 한다.
 *   2. GFM 취소선 `~~기존 값~~` → `<del>` 을 인라인 문법으로 **추가 해석**한다. Markdown 기본
 *      의미를 살리는 것일 뿐 텍스트를 합치거나 나누거나 순서를 바꾸지 않는다.
 *
 * 취소선을 delta 로 한정하는 이유는 기존(자유 형식) 본문·다른 화면의 렌더링 동작을 그대로
 * 유지하기 위해서다 — `changeHistoryEnabled=false`·필드 누락이면 파싱·출력이 이전과 완전히 같다.
 * `(기존)`·`(변경)`·`변경된 사실` 같은 한국어 표기는 어디서도 해석하지 않는다.
 */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "p"; text: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "ul"; items: { text: string; children: string[] }[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "code"; text: string };

const HEADING = /^(#{1,6})\s+(.*)$/;
const UL_ITEM = /^[-*]\s+(.*)$/;
const UL_CHILD = /^\s{2,}[-*]\s+(.*)$/;
const OL_ITEM = /^\d+[.)]\s+(.*)$/;
const HR = /^-{3,}\s*$/;
/** 표 구분행(|---|:--:|…) — 셀이 전부 -·: 로만 구성. */
const TABLE_SEPARATOR = /^\|?[\s:|-]+\|?$/;

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Markdown 원문 → 블록 목록. **delta 여부를 받지 않는다** — 같은 본문이 항상 같은 구조로
 * 파싱되어야 하고(계약), 폼별 재조합 분기를 두면 그 자리에서 원문이 변형되기 때문이다.
 */
function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // 코드 펜스 — 닫는 ``` 전까지 원문 그대로(언어 표기는 표시하지 않음).
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        buf.push(lines[i] ?? "");
        i += 1;
      }
      i += 1; // 닫는 펜스(또는 EOF)
      blocks.push({ kind: "code", text: buf.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      // markdown 원본 depth 를 그대로 싣는다 — h 태그로 낮추는 건 렌더 단계(headingTag)의 몫이다.
      blocks.push({ kind: "heading", level: heading[1]!.length, text: heading[2] ?? "" });
      i += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith(">")) {
        buf.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ kind: "quote", lines: buf });
      continue;
    }

    if (UL_ITEM.test(line)) {
      const items: { text: string; children: string[] }[] = [];
      while (i < lines.length) {
        const current = lines[i] ?? "";
        const child = UL_CHILD.exec(current);
        if (child && items.length > 0) {
          items[items.length - 1]!.children.push(child[1] ?? "");
          i += 1;
          continue;
        }
        const item = UL_ITEM.exec(current);
        if (!item) break;
        items.push({ text: item[1] ?? "", children: [] });
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (OL_ITEM.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const item = OL_ITEM.exec(lines[i] ?? "");
        if (!item) break;
        items.push(item[1] ?? "");
        i += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    if (line.trimStart().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").trimStart().startsWith("|")) {
        const raw = (lines[i] ?? "").trim();
        if (!TABLE_SEPARATOR.test(raw)) rows.push(splitTableRow(raw));
        i += 1;
      }
      if (rows.length > 0) {
        blocks.push({ kind: "table", header: rows[0] ?? [], rows: rows.slice(1) });
      }
      continue;
    }

    if (HR.test(line.trim())) {
      i += 1;
      continue;
    }

    // 문단 — 다른 블록 시작 전까지의 연속 줄을 하나로 합친다(Markdown soft break 기본 의미).
    const buf: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? "";
      if (
        current.trim() === "" ||
        current.startsWith("```") ||
        current.startsWith(">") ||
        HEADING.test(current) ||
        UL_ITEM.test(current) ||
        OL_ITEM.test(current) ||
        current.trimStart().startsWith("|")
      ) {
        break;
      }
      buf.push(current.trim());
      i += 1;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }

  return blocks;
}

/**
 * markdown depth → HTML heading 태그. 페이지가 h1 을 이미 쓰므로 본문은 h2 부터 시작한다.
 *
 * delta 본문은 `## 주제명` → `### 변경사항` → `#### …` 처럼 중첩 헤더를 쓰므로 원문 depth 를
 * h2~h6 로 **그대로** 옮긴다(구조·순서 보존). 헤더 문구는 읽지 않는다 — depth 만 옮긴다.
 */
function headingTag(level: number, delta: boolean): "h2" | "h3" | "h4" | "h5" | "h6" {
  // 기존(자유 형식) 본문은 예전 그대로 h2/h3 로만 접는다 — 렌더링 회귀를 만들지 않는다.
  if (!delta) return level <= 2 ? "h2" : "h3";
  const clamped = Math.min(Math.max(level, 2), 6);
  return (["h2", "h3", "h4", "h5", "h6"] as const)[clamped - 2]!;
}

/** 인라인 토큰 — **굵게** · `코드` · [텍스트](http/https URL). 그 외는 텍스트 그대로. */
const INLINE_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
/** delta 전용 — 위 토큰에 GFM 취소선(~~…~~)을 더한다. 기존 본문의 `~~` 는 지금처럼 원문 유지. */
const INLINE_TOKEN_DELTA = /(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
const INLINE_LINK = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

function renderInline(text: string, keyPrefix: string, delta: boolean): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let seq = 0;
  const pattern = delta ? INLINE_TOKEN_DELTA : INLINE_TOKEN;
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-t${seq}`;
    if (token.startsWith("**")) {
      nodes.push(<b key={key}>{token.slice(2, -2)}</b>);
    } else if (token.startsWith("~~")) {
      nodes.push(<del key={key}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      const link = INLINE_LINK.exec(token);
      if (link) {
        nodes.push(
          <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token); // 방어적 — 토큰 매칭과 링크 파싱이 어긋나면 원문 유지
      }
    }
    last = match.index + token.length;
    seq += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderBlock(block: Block, index: number, delta: boolean): ReactNode {
  const key = `md-${index}`;
  switch (block.kind) {
    case "heading": {
      // 원본 depth 를 보존한 태그만 고른다 — 헤더 문구로 역할을 붙이지 않는다(계약).
      const Tag = headingTag(block.level, delta);
      return <Tag key={key}>{renderInline(block.text, key, delta)}</Tag>;
    }
    case "p":
      return <p key={key}>{renderInline(block.text, key, delta)}</p>;
    case "quote":
      return (
        <blockquote key={key}>
          {block.lines.map((line, i) => (
            <p key={`${key}-q${i}`} className="last:mb-0">
              {renderInline(line, `${key}-q${i}`, delta)}
            </p>
          ))}
        </blockquote>
      );
    case "ul":
      return (
        <ul key={key}>
          {block.items.map((item, i) => (
            <li key={`${key}-li${i}`}>
              {renderInline(item.text, `${key}-li${i}`, delta)}
              {item.children.length > 0 && (
                <ul>
                  {item.children.map((child, j) => (
                    <li key={`${key}-li${i}-c${j}`}>
                      {renderInline(child, `${key}-li${i}-c${j}`, delta)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key}>
          {block.items.map((item, i) => (
            <li key={`${key}-li${i}`}>{renderInline(item, `${key}-li${i}`, delta)}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <table key={key}>
          <thead>
            <tr>
              {block.header.map((cell, i) => (
                <th key={`${key}-h${i}`}>{renderInline(cell, `${key}-h${i}`, delta)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={`${key}-r${r}`}>
                {row.map((cell, c) => (
                  <td key={`${key}-r${r}-c${c}`}>
                    {renderInline(cell, `${key}-r${r}-c${c}`, delta)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "code":
      return (
        <pre key={key} className="code">
          {block.text}
        </pre>
      );
  }
}

/**
 * Markdown 본문 → .md-viewer 스코프의 React 요소. 빈 본문은 호출부가 걸러 이 컴포넌트는 항상 내용이 있다.
 *
 * `delta` 는 리포트 응답의 `changeHistoryEnabled` 를 그대로 받는다(기본 false = 기존 자유 형식).
 * 계정 설정이 아니라 **그 보고서 응답값**이어야 한다 — 판정은 lib/report-delta.ts 한 곳에서만 한다.
 * 여기서 `delta` 가 하는 일은 `.md-delta` variant 를 붙이고 취소선 문법을 켜는 것뿐이다.
 */
export function ReportMarkdown({
  markdown,
  delta = false,
}: {
  markdown: string;
  delta?: boolean;
}) {
  return (
    <div className={delta ? "md-viewer md-delta" : "md-viewer"}>
      {parseBlocks(markdown).map((block, index) => renderBlock(block, index, delta))}
    </div>
  );
}
