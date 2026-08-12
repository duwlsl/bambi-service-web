import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * /wiki 관심사 관리 UI 의 불변식.
 *
 * 화면 회귀보다 **정책 회귀**를 막는 게 목적이다: 목록 상한이 사라지면 관심사가 늘수록 패널이
 * 다시 길어지고, 근거 문구를 코드에 직접 쓰면 API 에 없는 이유를 지어내게 된다.
 */
const found = readFileSync(new URL("../components/wiki/wiki-found.tsx", import.meta.url), "utf8");
const mine = readFileSync(
  new URL("../components/wiki/wiki-my-interests.tsx", import.meta.url),
  "utf8",
);
const screen = readFileSync(new URL("../components/wiki/wiki-screen.tsx", import.meta.url), "utf8");

/**
 * "이 문구가 없어야 한다" 류 검사는 **주석을 뺀 코드**만 본다.
 * 왜 그 표기를 지웠는지 설명한 주석(예: confidence 가 전부 52% 라 뺐다)까지 걸리면,
 * 결정의 근거를 파일에 남기는 것 자체가 불가능해진다.
 */
function code(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const foundCode = code(found);
const mineCode = code(mine);

test("두 목록 모두 기본 노출 개수 상한을 둔다", () => {
  assert.match(found, /const FOUND_PREVIEW = 2;/);
  assert.match(found, /candidates\.slice\(0, FOUND_PREVIEW\)/);
  assert.match(mine, /const MY_PREVIEW = 6;/);
  assert.match(mine, /interests\.slice\(0, MY_PREVIEW\)/);
});

test("상한을 넘으면 더 보기·접기 토글을 제공한다", () => {
  assert.match(found, /추천 \$\{restCount\}개 더 보기/);
  assert.match(mine, /전체 \$\{state\.data\.length\}개 보기/);
  for (const source of [found, mine]) {
    assert.match(source, /접기/);
    assert.match(source, /aria-expanded=\{expanded\}/);
  }
});

test("추천 목록은 항목 카드 없이 한 줄 압축 행으로 둔다", () => {
  // 흰 패널 위에 항목마다 회색 카드가 겹치면 화면이 무거워지고 세로로 길어진다(2026-08-12 검수).
  // 구분은 얇은 선이 맡고, 이름만 남은 폭을 쓰고 버튼 둘은 줄어들지 않는다 → 320px 에서도 한 줄.
  assert.match(found, /divide-y divide-border/);
  assert.match(found, /min-w-0 flex-1 truncate/);
  assert.match(found, /min-h-8 shrink-0/);
  assert.doesNotMatch(foundCode, /bg-background|bg-secondary/);
});

test("추천 목록의 동작은 아이콘이 아니라 문구로 드러낸다", () => {
  // `＋` 단독 칩·`×` 단독 버튼으로 되돌아가지 않게 텍스트 라벨과 aria-label 을 함께 고정한다.
  assert.match(found, /aria-label=\{`\$\{name\} 내 관심사로 추가`\}/);
  assert.match(found, /aria-label=\{`\$\{name\} 추천에서 숨기기`\}/);
  assert.match(found, />\s*추가\s*<\/Button>/);
  assert.match(found, />\s*숨기기\s*<\/Button>/);
  // 주 동작인 `추가` 가 줄 끝에 온다 → 소스에서도 숨기기가 먼저다(2026-08-12 검수).
  assert.ok(
    foundCode.indexOf('data-action="hide"') < foundCode.indexOf("내 관심사로 추가"),
    "숨기기 버튼이 추가 버튼보다 먼저 와야 한다",
  );
  // 반복되는 버튼을 단색 signal 로 채우지 않는다 — 브랜드 틴트(--wash)만 쓴다.
  assert.match(found, /bg-wash/);
  assert.doesNotMatch(foundCode, /bg-primary/);
});

test("되돌릴 수 없는 숨기기에는 확인 단계를 둔다", () => {
  // POST /api/wiki/tags/blocks 는 해제 API 가 없다 → 한 번 누르면 끝나면 안 된다.
  assert.match(found, /숨길까요\?/);
  assert.match(found, /data-confirm="hide"/);
});

test("내 관심사 삭제는 편집 모드 안에서만 노출된다", () => {
  /*
    평상시 칩은 span 이라 눌러도 아무 일이 없어야 한다 — 삭제 `×` 는 편집 중에만 붙는다.
    삭제는 DELETE /api/interests/{id}(soft delete)이고 지운 이름은 옆 발견 목록으로 돌아가
    한 번에 되돌릴 수 있으므로(wiki-screen 의 removedNames) 확인 모달을 두지 않는다.
    `편집 → ×` 자체가 2단계다.
  */
  assert.match(mine, /const editing = editRequested && interests\.length > 0;/);
  assert.match(mine, /\{editing \? "완료" : "편집"\}/);
  assert.match(mine, /\{editing && \(/);
  assert.match(mine, /aria-label=\{`\$\{interest\.name\} 관심사 삭제`\}/);
  // 요청 중 중복 클릭 방지.
  assert.match(mine, /disabled=\{busy\}/);
  assert.match(mine, /aria-busy=\{busy\}/);
});

test("삭제 전용 팝오버는 남아 있지 않다", () => {
  // 담을 게 삭제 하나뿐이라 구조가 과했다(2026-08-12 검수) → 편집 모드로 대체하고 전부 걷어냈다.
  for (const source of [mine, screen]) {
    assert.doesNotMatch(source, /popover|Popover/);
  }
  // 이 기능만을 위해 추가했던 공용 컴포넌트도 함께 지웠다.
  assert.throws(() => readFileSync(new URL("../components/ui/popover.tsx", import.meta.url)));
  // 팝오버 근거 표시 때문에 넘기던 prop 도 남기지 않는다.
  assert.doesNotMatch(mine, /wikiTags/);
  assert.doesNotMatch(screen, /wikiTags/);
});

test("두 목록 모두 근거 줄을 두지 않고 문구를 지어내지도 않는다", () => {
  /*
    agent 근거는 사실상 "저장한 자료에서 반복해 나타난 주제예요" 하나로 수렴해서, 어느 항목을
    열어도 같은 문장이 나왔다 — 읽을 이유가 없는 줄이라 발견 행과 팝오버 양쪽에서 걷어냈다
    (2026-08-12 검수). 되살릴 거면 근거가 실제로 갈리는지부터 확인할 것.
  */
  for (const source of [foundCode, mineCode]) {
    assert.doesNotMatch(source, /reasonMessages/);
    // constants/wiki.ts 의 확정 문구를 컴포넌트에 복사해 두면 근거 없는 항목에도 새어 나간다.
    assert.doesNotMatch(source, /저장한 자료에서 반복해 나타난 주제예요/);
    assert.doesNotMatch(source, /관련 카드에 좋아요를 눌렀어요/);
  }
});

test("내 관심사에는 근거 없는 출처·신뢰도 표기를 두지 않는다", () => {
  // fetchUserInterests 가 source=USER 만 반환한다 → 구분할 데이터가 없다.
  assert.doesNotMatch(mineCode, /직접 설정|AI 추천|LLM 추론|신뢰도/);
  assert.doesNotMatch(mineCode, /confidence/);
});

test("2열 배치에서 두 카드가 같은 높이로 늘어난다", () => {
  /*
    `items-start` 면 두 카드가 각자 콘텐츠 높이라 나란한 카드의 아랫변이 어긋난다.
    grid 기본 stretch 로 두면 같은 행의 더 높은 카드에 맞춰 둘 다 늘어나고,
    1열(<900px)에서는 각자 자기 행이라 콘텐츠 높이 그대로다 — 고정 높이를 박지 않는다.
  */
  // 바깥 페이지 레이아웃도 items-start 를 쓰므로 두 패널을 감싼 grid 만 떼어 본다.
  const grid = screen.match(/className="mb-8 grid[^"]*"/)?.[0] ?? "";
  assert.match(grid, /grid-cols-1 gap-3 min-\[900px\]:grid-cols-2/);
  assert.doesNotMatch(grid, /items-start|items-center|items-baseline/);
  assert.doesNotMatch(grid, /h-\[|min-h-\[/);
});

test("내 관심사 칩은 새 색을 만들지 않고 기존 토큰만 쓴다", () => {
  // 테두리는 원색(--primary)이 아니라 주황 틴트 토큰 — 칩이 여러 개 반복돼도 튀지 않게.
  assert.match(mine, /border-wash-strong/);
  assert.doesNotMatch(mineCode, /border-primary/);
  assert.match(mine, /bg-card/); // 라이트 흰색 · 다크는 카드 토큰(순백 아님)
  assert.match(mine, /hover:bg-wash/); // 아주 옅은 주황 틴트
  assert.match(mine, /text-foreground/); // 본문색 유지
  assert.doesNotMatch(mineCode, /#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(/);
});

test("공용 버튼 컴포넌트를 재사용한다", () => {
  for (const source of [found, mine]) {
    assert.match(source, /import \{ Button \} from "@\/components\/ui\/button";/);
  }
});
